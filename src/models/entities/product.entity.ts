import { BaseEntity } from '@/base/entity.base';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { User } from './user.entity';
import { ProductReview } from './product-review.entity';

@Schema({ timestamps: true })
export class Product extends BaseEntity {
  @Prop({ required: true })
  name: string;

  @Prop()
  code: string;

  @Prop({ required: true })
  category: string;

  @Prop({ type: [String], default: [] })
  gender: string[];

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  escrow: number;

  @Prop()
  priceSale: number;

  @Prop()
  taxes: number;

  @Prop()
  quantity: number;

  @Prop()
  available: number;

  @Prop()
  inventoryType: string;

  @Prop({ type: [String], default: [] })
  colors: string[];

  @Prop({ type: [String], default: [] })
  sizes: string[];

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop()
  coverUrl: string;

  @Prop()
  subDescription: string;

  @Prop()
  description: string;

  @Prop()
  publish: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop()
  sku: string;

  @Prop({ type: Object, default: { enabled: false, content: 'NEW' } })
  newLabel: {
    enabled: boolean;
    content: string;
  };

  @Prop({ type: Object, default: { enabled: false, content: 'SALE' } })
  saleLabel: {
    enabled: boolean;
    content: string;
  };

  @Prop()
  totalRatings: number;

  @Prop()
  totalSold: number;

  @Prop()
  totalReviews: number;

  // ⭐ Trỏ qua User
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  sellerId: Types.ObjectId | User;

  // ⭐ Trỏ tới danh sách Review
  @Prop({ type: [{ type: Types.ObjectId, ref: 'ProductReview' }], default: [] })
  reviews: (Types.ObjectId | ProductReview)[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);
