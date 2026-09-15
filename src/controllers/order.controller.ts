import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CreateOrderDto } from '@/models/requests/create-order.request';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Order } from '@/models/entities/order.entity';
import { OrdersService } from '@/services/order.service';
import { SessionType } from '@/enums/session-type.enum';
import { JwtAccessTokenGuard } from '@/guards';
import { CurrentUserId } from '@/decorators';
import { UpdateItemStatusDto } from '@/models/requests/update-order.request';

@ApiBearerAuth(SessionType.ACCESS)
@ApiTags('Orders')
@Controller('orders')
@UseGuards(JwtAccessTokenGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ✅ CREATE ORDER
  @Post()
  @ApiOperation({ summary: 'Tạo order mới' })
  @ApiParam({
    name: 'buyerId',
    description: 'ID của buyer',
    example: '65f3ab12c9e77a0012345678',
  })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({
    status: 201,
    description: 'Tạo order thành công',
    type: Order,
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  async createOrder(
    @Body() dto: CreateOrderDto,
    @CurrentUserId() buyerId: string,
  ) {
    return this.ordersService.createOrder(dto, buyerId);
  }

  // ✅ GET ORDERS BY BUYER + COUNT
  @Get('buyer')
  @ApiOperation({ summary: 'Lấy danh sách order theo buyer' })
  @ApiParam({
    name: 'buyerId',
    description: 'ID của buyer',
    example: '65f3ab12c9e77a0012345678',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách order và tổng số lượng',
    schema: {
      example: {
        items: [
          {
            _id: '661a3b...',
            buyer: '65f3ab...',
            items: [
              {
                productId: '6601...',
                quantity: 2,
                orderContractId: '6633...',
              },
            ],
            isCompleted: false,
            createdAt: '2025-03-08T08:00:00.000Z',
          },
        ],
        count: 1,
      },
    },
  })
  async getOrdersByBuyer(@CurrentUserId() buyerId: string) {
    return this.ordersService.getOrdersWithCountByBuyer(buyerId);
  }

  // ✅ GET ORDERS BY SELLER + COUNT
  @Get('seller')
  @ApiOperation({ summary: 'Lấy danh sách order theo seller' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách order và tổng số lượng của seller',
  })
  async getOrdersBySeller(@CurrentUserId() sellerId: string) {
    return this.ordersService.getOrdersWithCountBySeller(sellerId);
  }

  // ✅ GET ORDERS REFERRED BY ME (AFFILIATE) + COUNT
  @Get('referrer')
  @ApiOperation({ summary: 'Lấy danh sách order được giới thiệu bởi affiliate hiện tại' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách order và tổng số lượng do user hiện tại giới thiệu',
  })
  async getOrdersByReferrer(@CurrentUserId() referrerId: string) {
    return this.ordersService.getOrdersWithCountByReferrer(referrerId);
  }

  // ✅ GET ORDER DETAIL
  @Get(':orderId')
  @ApiOperation({ summary: 'Lấy chi tiết 1 order' })
  @ApiParam({
    name: 'orderId',
    description: 'ID của order',
    example: '676a82f2c9e77a00ab123456',
  })
  @ApiResponse({
    status: 200,
    description: 'Chi tiết order',
    type: Order,
  })
  @ApiResponse({
    status: 404,
    description: 'Order không tồn tại',
  })
  async getOrderDetail(
    @Param('orderId') orderId: string,
    @CurrentUserId() buyerId: string,
  ) {
    return this.ordersService.getOrderDetail(orderId, buyerId);
  }

  @Patch(':orderId/item-status')
  updateItemStatus(
    @Param('orderId') orderId: string,
    @Body() dto: UpdateItemStatusDto,
  ) {
    return this.ordersService.updateItemStatus(orderId, dto);
  }
}
