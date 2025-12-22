import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Types } from 'mongoose';
import { ProductsRepository } from '@/models/repos/product.repo';
import { ProductReviewsRepository } from '@/models/repos/product-review.repo';

@Injectable()
export class SeedProductsService implements OnModuleInit {
  constructor(
    private readonly productsRepo: ProductsRepository,
    private readonly reviewsRepo: ProductReviewsRepository,
  ) {}

  async onModuleInit() {
    // await this.seed();
    // await this.updatePriceAndEscrow();
    // await this.updateProductReviews();
  }

  async seed() {
    const filePath = path.resolve(process.cwd(), 'product.json');
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(rawData);

    // 3 seller IDs
    const sellers = [
      new Types.ObjectId('692bb953007be6c2b9e1bfbe'),
      new Types.ObjectId('69304403f2c21e98d1fb2cba'),
      new Types.ObjectId('69304427f2c21e98d1fb2cc5'),
    ];

    // Clear existing data
    await this.productsRepo.deleteMany({});
    await this.reviewsRepo.deleteMany({});

    let sellerIndex = 0;

    for (const prod of data.products) {
      // assign sellerId vòng tròn để đều nhau
      const sellerId = sellers[sellerIndex % sellers.length];
      sellerIndex++;

      // Tách review data
      const reviewsData = prod.reviews || [];
      delete prod.reviews; // remove khỏi product trước khi tạo

      // Create Product
      const createdProduct = await this.productsRepo.create({
        ...prod,
        sellerId,
      });

      // Create ProductReview
      for (const review of reviewsData) {
        const createdReview = await this.reviewsRepo.create({
          ...review,
          productId: createdProduct._id,
          postedAt: new Date(review.postedAt),
        });

        // push review id vào product
        const tempReviewId = new Types.ObjectId();
        createdProduct.reviews.push(tempReviewId);
      }

      await this.productsRepo.create(createdProduct);
    }

    console.log('✅ Seed products & reviews completed');
  }

  async updatePriceAndEscrow() {
    const products = await this.productsRepo.findAll({}, {});
    for (const prod of products.items) {
      const randomPrice = parseFloat(
        (Math.random() * (3 - 0.5) + 0.5).toFixed(4),
      );
      await this.productsRepo.update(prod._id, {
        price: randomPrice,
        priceSale: randomPrice - 0.1,
        escrow: parseFloat((randomPrice / 2).toFixed(4)),
      });
    }
    console.log('✅ Updated price & escrow for all products');
  }

  async updateProductReviews() {
    console.log('🔁 Start syncing product reviews...');

    // ✅ 1. Lấy toàn bộ reviews (BẮT BUỘC TRUYỀN {})
    const { items: allReviews } = await this.reviewsRepo.findAll({});

    if (!allReviews.length) {
      console.log('⚠️ No reviews found');
      return;
    }

    // ✅ 2. Group reviews theo productId
    const reviewMap = new Map<string, Types.ObjectId[]>();
    const ratingMap = new Map<string, number[]>();

    for (const review of allReviews) {
      if (!review.productId) continue;

      const productId = (review.productId as Types.ObjectId).toString();
      const reviewId = review._id as Types.ObjectId;

      if (!reviewMap.has(productId)) {
        reviewMap.set(productId, []);
        ratingMap.set(productId, []);
      }

      reviewMap.get(productId)!.push(reviewId);

      if (typeof review.rating === 'number') {
        ratingMap.get(productId)!.push(review.rating);
      }
    }

    // ✅ 3. Update từng product (DÙNG update() thay vì updateById)
    for (const [productId, reviewIds] of reviewMap.entries()) {
      const ratings = ratingMap.get(productId) || [];

      const totalReviews = reviewIds.length;
      const totalRatings =
        ratings.length > 0
          ? Number(
              (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1),
            )
          : 0;

      await this.productsRepo.update(productId, {
        reviews: reviewIds,
        totalReviews,
        totalRatings,
      });

      console.log(
        `✅ Updated product ${productId} | reviews=${totalReviews} | rating=${totalRatings}`,
      );
    }

    console.log('🎉 Sync product reviews completed!');
  }
}
