import { BaseEntity } from '@/base/entity.base';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { User } from './user.entity';
import { OrderType } from '@/enums/order-type.enum';

@Schema({ _id: false })
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  orderContractId: Types.ObjectId;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: Boolean, default: false })
  isVerifyBySeller: boolean;

  @Prop({ enum: OrderType, default: OrderType.NONE })
  status: OrderType;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ timestamps: true })
export class Order extends BaseEntity {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  buyer: Types.ObjectId | User;

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

  @Prop({ default: false })
  isCompleted: boolean;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
