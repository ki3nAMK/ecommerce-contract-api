import { BaseRepositoryAbstract } from '@/base/abstract-repository.base';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { Product } from '../entities/product.entity';

@Injectable()
export class ProductsRepository extends BaseRepositoryAbstract<Product> {
  constructor(
    @InjectModel(Product.name)
    private readonly products_repository: Model<Product>,
  ) {
    super(products_repository);
  }

  findWithPopulate(filter: FilterQuery<Product>, skip: number, limit: number) {
    return this.products_repository
      .find(filter)
      .populate('sellerId')
      .populate('reviews')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
  }

  count(filter: FilterQuery<Product>) {
    return this.products_repository.countDocuments(filter);
  }

  findOneWithPopulate(filter: FilterQuery<Product>) {
    return this.products_repository
      .findOne(filter)
      .populate('sellerId')
      .populate('reviews');
  }
}
