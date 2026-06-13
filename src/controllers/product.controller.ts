import { CurrentUserId, SkipVerification } from '@/decorators';
import { PaginationDto } from '@/models/requests/pagination.request';
import { ProductService } from '@/services/product.service';
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAccessTokenGuard } from '@/guards';
import { ApiOkResponse, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('Products')
@Controller({
  path: 'products',
  version: '1',
})
export class ProductController {
  constructor(private readonly productService: ProductService) { }

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
