import { BaseEntity } from '@/base/entity.base';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Product } from './product.entity';
import { User } from './user.entity';

@Schema({ timestamps: true })
export class ProductReview extends BaseEntity {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId | Product;

  @Prop()
  name: string;

  @Prop()
  avatarUrl: string;

  @Prop()
  comment: string;

  @Prop()
  rating: number;

  @Prop()
  helpful: number;

  @Prop()
  isPurchased: boolean;

  @Prop({ type: [String], default: [] })
  attachments: string[];

  @Prop()
  postedAt: Date;

  // Optional: Nếu review gắn với user
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId | User;
}

export const ProductReviewSchema = SchemaFactory.createForClass(ProductReview);
