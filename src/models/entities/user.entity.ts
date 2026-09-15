import { BaseEntity } from '@/base/entity.base';
import { Role } from '@/enums/role.enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class User extends BaseEntity {
  @Prop({ required: false })
  name: string;

  @Prop({
    required: false,
    match: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
    unique: false,
    default: null,
    sparse: true,
  })
  email: string;

  @Prop({
    required: false,
    select: false,
  })
  password: string;

  @Prop({ required: true })
  color: string;

  @Prop({
    default:
      'https://cdn.pixabay.com/photo/2016/08/08/09/17/avatar-1577909_960_720.png',
  })
  avatar: string;

  @Prop({ enum: Role, default: Role.CLIENT })
  role: Role;

  @Prop({ type: Number, default: Math.floor(Math.random() * 10000) })
  nonce: number;

  @Prop({ type: String, unique: true, required: true })
  publicAddress: string;

  @Prop({ type: String, unique: true, sparse: true, index: true })
  referralCode: string;

  async comparePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.pre<UserDocument>('save', async function (next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});
