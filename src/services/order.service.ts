import { OrderType } from '@/enums/order-type.enum';
import { Order } from '@/models/entities/order.entity';
import { OrdersRepository } from '@/models/repos/order.repo';
import {
  CreateOrderDto,
  CreateOrderItemDto,
} from '@/models/requests/create-order.request';
import { UpdateItemStatusDto } from '@/models/requests/update-order.request';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

@Injectable()
export class OrdersService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
  ) {}

  async createOrder(dto: CreateOrderDto, buyerId: string): Promise<Order> {
    const items = dto.items.map((item: CreateOrderItemDto) => ({
      productId: new Types.ObjectId(item.productId),
      quantity: item.quantity,
      orderContractId: new Types.ObjectId(),
      isVerifyBySeller: false,
      status: OrderType.NONE,
    }));

    const order = new this.orderModel({
      buyer: new Types.ObjectId(buyerId),
      items,
      isCompleted: false,
    });

    return order.save();
  }

  async removeItemFromOrder(
    orderId: string,
    orderContractId: string,
  ): Promise<Order | null> {
    const order = await this.ordersRepository.findOneById(orderId);
    if (!order) throw new NotFoundException('Order not found');

    const newItems = order.items.filter(
      (item) => item.orderContractId.toString() !== orderContractId,
    );

    if (newItems.length === 0) {
      ~(await this.ordersRepository.softDelete(orderId));
      return null;
    }

    return this.ordersRepository.update(orderId, { items: newItems });
  }

  async getOrdersByBuyer(buyerId: string): Promise<Order[]> {
    return this.orderModel.find({ buyer: new Types.ObjectId(buyerId) });
  }

  async getOrdersWithCountByBuyer(buyerId: string): Promise<{
    items: Order[];
    count: number;
  }> {
    const items = await this.orderModel
      .find({
        buyer: new Types.ObjectId(buyerId),
      })
      .populate('items.productId');

    const count = await this.orderModel.countDocuments({
      buyer: new Types.ObjectId(buyerId),
    });

    return {
      items,
      count,
    };
  }

  async getOrderDetail(orderId: string, buyerId: string) {
    const order = (await this.orderModel
      .findOne({
        _id: new Types.ObjectId(orderId),
        buyer: new Types.ObjectId(buyerId),
      })
      .populate({
        path: 'items.productId',
        model: 'Product',
      })
      .lean()) as Order;

    if (!order) {
      throw new NotFoundException('Không tìm thấy order này');
    }

    return {
      data: order,
    };
  }

  async updateItemStatus(orderId: string, dto: UpdateItemStatusDto) {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');

    // tìm item theo productId
    const item = order.items.find(
      (i) => i.productId.toString() === dto.productId,
    );

    if (!item) {
      throw new BadRequestException(
        'Item with productId not found in this order',
      );
    }

    console.log('Update item:', item.productId, '→', dto.status);

    item.status = dto.status;

    await order.save();
    return order;
  }
}
