import { BaseEntity } from '@/base/entity.base';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { User } from './user.entity';

@Schema({ _id: false })
export class AirdropRecipient {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId | User;

  @Prop({ required: true })
  publicAddress: string;

  @Prop({ required: true })
  amountWei: string;

  @Prop({ default: false })
  claimed: boolean;

  @Prop()
  txHash?: string;
}

export const AirdropRecipientSchema = SchemaFactory.createForClass(AirdropRecipient);

@Schema({ timestamps: true })
export class AirdropCampaign extends BaseEntity {
  @Prop({ required: true })
  name: string;

  // on-chain numeric campaign id, also the Mongo-side lookup key
  @Prop({ required: true, unique: true })
  campaignId: number;

  @Prop({ required: true })
  merkleRoot: string;

  @Prop({ type: [AirdropRecipientSchema], required: true })
  recipients: AirdropRecipient[];

  @Prop({ required: true })
  totalAmountWei: string;

  @Prop({ enum: ['draft', 'active'], default: 'draft' })
  status: string;
}

export const AirdropCampaignSchema = SchemaFactory.createForClass(AirdropCampaign);
