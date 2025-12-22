import { BaseRepositoryAbstract } from '@/base/abstract-repository.base';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order } from '../entities/order.entity';

@Injectable()
export class OrdersRepository extends BaseRepositoryAbstract<Order> {
  constructor(
    @InjectModel(Order.name)
    private readonly ordersRepository: Model<Order>,
  ) {
    super(ordersRepository);
  }

  async findByBuyer(buyerId: Types.ObjectId) {
    return this.ordersRepository.find({ buyer: buyerId }).exec();
  }

  async completeOrder(orderId: Types.ObjectId) {
    return this.ordersRepository.findByIdAndUpdate(
      orderId,
      { isCompleted: true },
      { new: true },
    );
  }
}
