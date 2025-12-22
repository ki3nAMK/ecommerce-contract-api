import { BaseRepositoryAbstract } from '@/base/abstract-repository.base';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProductReview } from '../entities/product-review.entity';

@Injectable()
export class ProductReviewsRepository extends BaseRepositoryAbstract<ProductReview> {
  constructor(
    @InjectModel(ProductReview.name)
    private readonly product_reviews_repository: Model<ProductReview>,
  ) {
    super(product_reviews_repository);
  }
}
