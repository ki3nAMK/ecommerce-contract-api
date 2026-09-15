import { CurrentUserId, SkipVerification } from '@/decorators';
import { CreateProductDto } from '@/models/requests/create-product.request';
import { CreateReviewDto } from '@/models/requests/create-review.request';
import { PaginationDto } from '@/models/requests/pagination.request';
import { ProductReviewsService } from '@/services/product-review.service';
import { ProductService } from '@/services/product.service';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { JwtAccessTokenGuard } from '@/guards';
import { ApiOkResponse, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('Products')
@Controller({
  path: 'products',
  version: '1',
})
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly configService: ConfigService,
    private readonly productReviewsService: ProductReviewsService,
  ) { }

  @UseGuards(JwtAccessTokenGuard)
  @Post()
  @ApiOkResponse({ description: 'Create a new product (mints + registers seller on-chain)' })
  async create(
    @Body() dto: CreateProductDto,
    @CurrentUserId() sellerId: string,
  ) {
    return this.productService.createProduct(dto, sellerId);
  }

  @UseGuards(JwtAccessTokenGuard)
  @Post('upload-image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/products',
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  @ApiOkResponse({ description: 'Upload a product image, returns its public URL' })
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    const publicUrl = this.configService.get('publicUrl');
    return { url: `${publicUrl}/uploads/products/${file.filename}` };
  }

  @UseGuards(JwtAccessTokenGuard)
  @Patch(':id/publish')
  @ApiOkResponse({ description: 'Mark a product as published after on-chain listing succeeds' })
  async publish(@Param('id') id: string, @CurrentUserId() sellerId: string) {
    return this.productService.publishProduct(id, sellerId);
  }

  @UseGuards(JwtAccessTokenGuard)
  @Post(':id/reviews')
  @ApiOkResponse({ description: 'Post a review for a product (verified purchasers only)' })
  async createReview(
    @Param('id') id: string,
    @Body() dto: CreateReviewDto,
    @CurrentUserId() userId: string,
  ) {
    return this.productReviewsService.createReview(id, userId, dto);
  }

  @SkipVerification()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'Get all products with pagination & full populate',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  findAll(@Query() query: PaginationDto) {
    return this.productService.findAllWithPagination(query);
  }

  @UseGuards(JwtAccessTokenGuard)
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'Get my products (seller)',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async findMyProducts(
    @CurrentUserId() userId: string,
    @Query() query: PaginationDto,
  ) {
    const res = await this.productService.findBySeller(userId, query);
    return res;
  }

  @SkipVerification()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'Get product detail with full populate',
  })
  @ApiParam({
    name: 'id',
    example: '65fb1234567890abcdef1234',
  })
  async findOne(@Param('id') id: string) {
    const product = await this.productService.findByIdFullPopulate(id);

    return { data: product };
  }

  @SkipVerification()
  @Get('seller/:sellerId')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'Get products by seller with pagination',
  })
  @ApiParam({
    name: 'sellerId',
    example: '65fb1234567890abcdef1234',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  findBySeller(
    @Param('sellerId') sellerId: string,
    @Query() query: PaginationDto,
  ) {
    return this.productService.findBySeller(sellerId, query);
  }

  @SkipVerification()
  @Get('category/:category')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'Get products by category with pagination',
  })
  @ApiParam({
    name: 'category',
    example: 'fashion',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  findByCategory(
    @Param('category') category: string,
    @Query() query: PaginationDto,
  ) {
    return this.productService.findByCategory(category, query);
  }
}
