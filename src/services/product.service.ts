import { BaseServiceAbstract } from '@/base/abstract-service.base';
import { Product } from '@/models/entities/product.entity';
import { ProductsRepository } from '@/models/repos/product.repo';
import { PaginationDto } from '@/models/requests/pagination.request';
import { toObjectId } from '@/utils/helper';
import { Injectable } from '@nestjs/common';
import { FilterQuery } from 'mongoose';

@Injectable()
export class ProductService extends BaseServiceAbstract<Product> {
  constructor(private readonly product_repository: ProductsRepository) {
    super(product_repository);
  }

  async findAllWithPagination(
    pagination: PaginationDto,
    filter: FilterQuery<Product> = {},
  ) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    console.log('filter: ', filter)


    const [items, total] = await Promise.all([
      this.product_repository.findWithPopulate(filter, skip, limit),
      this.product_repository.count(filter),
    ]);

    return {
      data: items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByIdFullPopulate(productId: string) {
    const product = await this.product_repository.findOneWithPopulate({
      _id: productId,
    });

    if (!product) {
      throw new Error('Product not found');
    }

    return product;
  }

  async findBySeller(sellerId: string, pagination: PaginationDto) {
    return this.findAllWithPagination(pagination, {
      sellerId: toObjectId(sellerId),
    });
  }

  async findByCategory(category: string, pagination: PaginationDto) {
    return this.findAllWithPagination(pagination, {
      category,
    });
  }
}
