import { BaseServiceAbstract } from '@/base/abstract-service.base';
import { Product } from '@/models/entities/product.entity';
import { ProductsRepository } from '@/models/repos/product.repo';
import { CreateProductDto } from '@/models/requests/create-product.request';
import { PaginationDto } from '@/models/requests/pagination.request';
import { BlockchainService } from '@/services/blockchain.service';
import { UsersService } from '@/services/user.service';
import { toObjectId } from '@/utils/helper';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FilterQuery } from 'mongoose';

@Injectable()
export class ProductService extends BaseServiceAbstract<Product> {
  constructor(
    private readonly product_repository: ProductsRepository,
    private readonly usersService: UsersService,
    private readonly blockchainService: BlockchainService,
  ) {
    super(product_repository);
  }

  async createProduct(dto: CreateProductDto, sellerId: string): Promise<Product> {
    const seller = await this.usersService.getById(sellerId);
    if (!seller?.publicAddress) {
      throw new NotFoundException('Seller wallet address not found');
    }

    await this.blockchainService.ensureSellerRegistered(seller.publicAddress);
    const tokenId = await this.blockchainService.mintProductToken(
      seller.publicAddress,
      dto.quantity,
    );

    return this.product_repository.create({
      ...dto,
      sellerId: toObjectId(sellerId),
      tokenId,
      available: dto.quantity,
      coverUrl: dto.images[0],
      publish: 'draft',
    });
  }

  async publishProduct(productId: string, sellerId: string): Promise<Product> {
    const product = await this.product_repository.findOneWithPopulate({
      _id: productId,
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const productSellerId =
      (product.sellerId as any)?._id?.toString() ?? product.sellerId?.toString();

    if (productSellerId !== sellerId) {
      throw new ForbiddenException('Not the owner of this product');
    }

    return this.product_repository.update(productId, { publish: 'published' });
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
