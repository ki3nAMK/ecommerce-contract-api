import { OrderType } from '@/enums/order-type.enum';
import { Order } from '@/models/entities/order.entity';
import { Product } from '@/models/entities/product.entity';
import { OrdersRepository } from '@/models/repos/order.repo';
import {
  CreateOrderDto,
  CreateOrderItemDto,
} from '@/models/requests/create-order.request';
import { UpdateItemStatusDto } from '@/models/requests/update-order.request';
import { UsersService } from '@/services/user.service';
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
    private readonly usersService: UsersService,
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
  ) {}

  async createOrder(dto: CreateOrderDto, buyerId: string): Promise<Order> {
    const items = dto.items.map((item: CreateOrderItemDto) => ({
      productId: new Types.ObjectId(item.productId),
      quantity: item.quantity,
      orderContractId: new Types.ObjectId(),
      isVerifyBySeller: false,
      status: OrderType.NONE,
    }));

    let referrerId: Types.ObjectId | null = null;
    if (dto.referralCode) {
      const referrerUser = await this.usersService.getByReferralCode(
        dto.referralCode,
      );
      // invalid code or self-referral: silently ignore, order proceeds without a referrer
      if (referrerUser && referrerUser._id.toString() !== buyerId) {
        referrerId = referrerUser._id as Types.ObjectId;
      }
    }

    const order = new this.orderModel({
      buyer: new Types.ObjectId(buyerId),
      items,
      isCompleted: false,
      referrer: referrerId,
    });

    await order.save();
    return order.populate({
      path: 'referrer',
      model: 'User',
      select: 'publicAddress',
    });
  }

  async hasCompletedOrderForProduct(
    buyerId: string,
    productId: string,
  ): Promise<boolean> {
    const exists = await this.orderModel.exists({
      buyer: new Types.ObjectId(buyerId),
      items: {
        $elemMatch: {
          productId: new Types.ObjectId(productId),
          status: OrderType.DONE,
        },
      },
    });

    return !!exists;
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
      .populate({
        path: 'items.productId',
        model: 'Product',
      })
      .populate({
        path: 'buyer',
        model: 'User',
      })
      .populate({
        path: 'referrer',
        model: 'User',
        select: 'publicAddress',
      });

    const count = await this.orderModel.countDocuments({
      buyer: new Types.ObjectId(buyerId),
    });

    return {
      items,
      count,
    };
  }

  async getOrdersWithCountByReferrer(referrerId: string): Promise<{
    items: Order[];
    count: number;
  }> {
    const items = await this.orderModel
      .find({
        referrer: new Types.ObjectId(referrerId),
      })
      .populate({
        path: 'items.productId',
        model: 'Product',
      })
      .populate({
        path: 'buyer',
        model: 'User',
        select: 'name publicAddress',
      })
      .populate({
        path: 'referrer',
        model: 'User',
        select: 'publicAddress',
      });

    const count = await this.orderModel.countDocuments({
      referrer: new Types.ObjectId(referrerId),
    });

    return {
      items,
      count,
    };
  }

  async getOrderDetail(orderId: string, userId: string) {
    const order = (await this.orderModel
      .findOne({
        _id: new Types.ObjectId(orderId),
      })
      .populate({
        path: 'items.productId',
        model: 'Product',
      })
      .populate({
        path: 'buyer',
        model: 'User',
      })
      .populate({
        path: 'referrer',
        model: 'User',
        select: 'publicAddress',
      })
      .lean()) as any;

    if (!order) {
      throw new NotFoundException('Không tìm thấy order này');
    }

    const orderBuyerId = order.buyer?._id ? order.buyer._id.toString() : order.buyer?.toString();
    const isBuyer = orderBuyerId === userId;
    const isSeller = order.items.some(
      (item: any) => item.productId && item.productId.sellerId?.toString() === userId
    );

    if (!isBuyer && !isSeller) {
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

    console.log('Update item:', item.productId, '→', dto.status, dto.isVerifyBySeller);

    const oldStatus = item.status;

    if (dto.status) {
      item.status = dto.status;
    }
    if (dto.isVerifyBySeller !== undefined) {
      item.isVerifyBySeller = dto.isVerifyBySeller;
    }

    // Decrement available stock when Buyer deposits Escrow
    if (dto.status === OrderType.DEPOSIT_ESCROW && oldStatus !== OrderType.DEPOSIT_ESCROW) {
      const product = await this.productModel.findById(item.productId);
      if (product) {
        product.available = Math.max(0, product.available - item.quantity);
        await product.save();
        console.log(`Deducted stock for product ${product._id}: -${item.quantity}. New available: ${product.available}`);
      }
    }

    // Restore stock if the order is cancelled
    if (dto.status === OrderType.CANCLED && oldStatus !== OrderType.CANCLED) {
      if (oldStatus === OrderType.DEPOSIT_ESCROW || oldStatus === OrderType.FULLY_DEPOSITED) {
        const product = await this.productModel.findById(item.productId);
        if (product) {
          product.available += item.quantity;
          await product.save();
          console.log(`Restored stock for product ${product._id}: +${item.quantity}. New available: ${product.available}`);
        }
      }
    }

    await order.save();
    return order;
  }

  async getOrdersWithCountBySeller(sellerId: string): Promise<{
    items: Order[];
    count: number;
  }> {
    const items = await this.orderModel.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'populatedProducts',
        },
      },
      {
        $match: {
          'populatedProducts.sellerId': new Types.ObjectId(sellerId),
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    const populatedItems = await this.orderModel.populate(items, [
      {
        path: 'items.productId',
        model: 'Product',
      },
      {
        path: 'buyer',
        model: 'User',
      },
    ]);

    return {
      items: populatedItems,
      count: populatedItems.length,
    };
  }
}
