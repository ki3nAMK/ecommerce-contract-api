import { ProductReview } from '@/models/entities/product-review.entity';
import { ProductReviewsRepository } from '@/models/repos/product-review.repo';
import { ProductsRepository } from '@/models/repos/product.repo';
import { CreateReviewDto } from '@/models/requests/create-review.request';
import { OrdersService } from '@/services/order.service';
import { UsersService } from '@/services/user.service';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Types } from 'mongoose';

@Injectable()
export class ProductReviewsService {
  constructor(
    private readonly productReviewsRepository: ProductReviewsRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly ordersService: OrdersService,
    private readonly usersService: UsersService,
  ) {}

  async createReview(
    productId: string,
    userId: string,
    dto: CreateReviewDto,
  ): Promise<ProductReview> {
    const hasPurchased = await this.ordersService.hasCompletedOrderForProduct(
      userId,
      productId,
    );
    if (!hasPurchased) {
      throw new ForbiddenException(
        'Bạn cần mua và nhận sản phẩm này trước khi đánh giá',
      );
    }

    const existingReview = await this.productReviewsRepository.findOneByCondition({
      productId: new Types.ObjectId(productId),
      userId: new Types.ObjectId(userId),
    });
    if (existingReview) {
      throw new ConflictException('Bạn đã đánh giá sản phẩm này rồi');
    }

    const reviewer = await this.usersService.getById(userId);

    const review = await this.productReviewsRepository.create({
      productId: new Types.ObjectId(productId) as any,
      userId: new Types.ObjectId(userId) as any,
      name: reviewer?.name,
      avatarUrl: reviewer?.avatar,
      comment: dto.comment,
      rating: dto.rating,
      helpful: 0,
      isPurchased: true,
      attachments: [],
      postedAt: new Date(),
    });

    await this.recomputeProductRating(productId);

    return review;
  }

  private async recomputeProductRating(productId: string): Promise<void> {
    const { items: reviews } = await this.productReviewsRepository.findAll({
      productId: new Types.ObjectId(productId),
    });

    const totalReviews = reviews.length;
    const ratings = reviews
      .map((r) => r.rating)
      .filter((r): r is number => typeof r === 'number');

    const totalRatings =
      ratings.length > 0
        ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1))
        : 0;

    await this.productsRepository.update(productId, {
      reviews: reviews.map((r) => r._id) as any,
      totalReviews,
      totalRatings,
    });
  }
}
