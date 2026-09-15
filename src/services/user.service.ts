import { BaseServiceAbstract } from '@/base/abstract-service.base';
import { Role } from '@/enums/role.enum';
import { User } from '@/models/entities/user.entity';
import { UsersRepository } from '@/models/repos/user.repo';
import { MetamaskRegisterRequest } from '@/models/requests/register-metamask.request';
import { RegisterRequest } from '@/models/requests/register.request';
import { avatarUrlDemo } from '@/utils/constants';
import { convertObjectIdToString, getRandomAvatarColor } from '@/utils/helper';
import { generateReferralCode } from '@/utils/referral-code.util';
import { faker } from '@faker-js/faker';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { filter, forEach, get, map, omit } from 'lodash';
import { Model, Schema, Types } from 'mongoose';

@Injectable()
export class UsersService extends BaseServiceAbstract<User> {
  constructor(
    private readonly users_repository: UsersRepository,
    @InjectModel(User.name)
    private readonly user_model: Model<User>,
  ) {
    super(users_repository);
  }

  async getById(id: string): Promise<Partial<User> | null> {
    const user = await this.user_model.findById(id).lean().exec();
    if (user) {
      return omit({ ...user, id: user._id.toString() }, '_id', '__v');
    }
    return null;
  }

  async isTakenEmail(
    email: string,
  ): Promise<{ _id: Schema.Types.ObjectId | Types.ObjectId }> {
    return this.user_model.exists({ email });
  }

  async createUser(dto: RegisterRequest): Promise<{ userId: string }> {
    const randomAvatarIndex = Math.floor(Math.random() * avatarUrlDemo.length);

    const { id } = await this.users_repository.create({
      ...dto,
      avatar: avatarUrlDemo[randomAvatarIndex],
      color: getRandomAvatarColor(),
    });

    return { userId: id };
  }

  async createUserWithPublicAddress(
    dto: MetamaskRegisterRequest,
  ): Promise<User> {
    const randomAvatarIndex = Math.floor(Math.random() * avatarUrlDemo.length);
    const name = faker.person.fullName();

    const user = await this.users_repository.create({
      name,
      publicAddress: dto.publicAddress,
      avatar: avatarUrlDemo[randomAvatarIndex],
      color: getRandomAvatarColor(),
      email: faker.internet.email(),
    });

    return user;
  }

  async getByUsername(username: string): Promise<User> {
    return this.user_model
      .findOne({
        email: username,
      })
      .select('+password')
      .exec();
  }

  async getByPublicAddress(publicAddress: string): Promise<User> {
    return this.user_model
      .findOne({
        publicAddress: { $regex: new RegExp(`^${publicAddress}$`, 'i') },
      })
      .select('+password')
      .exec();
  }

  async getByReferralCode(code: string): Promise<User | null> {
    return this.user_model.findOne({ referralCode: code }).exec();
  }

  async ensureReferralCode(userId: string): Promise<string> {
    const existing = await this.user_model
      .findById(userId)
      .select('referralCode')
      .lean()
      .exec();

    if (existing?.referralCode) {
      return existing.referralCode;
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateReferralCode();
      try {
        await this.user_model
          .updateOne(
            { _id: userId, referralCode: { $exists: false } },
            { $set: { referralCode: code } },
          )
          .exec();
        return code;
      } catch (error: any) {
        if (error?.code === 11000) {
          continue; // collision on generated code, retry
        }
        throw error;
      }
    }

    throw new BadRequestException('Failed to generate referral code');
  }

  async comparePassword(password: string, user: User): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }

  async findAllUsers(userId: string): Promise<{
    items: User[];
    count: number;
  }> {
    const { count, items } = await this.findAll();

    return {
      items: filter(
        map(items, (user) =>
          omit({ ...user, id: user._id.toString() }, '_id', '__v'),
        ) as User[],
        (user) => user.id !== userId,
      ),
      count,
    };
  }

  async checkIfUsersExist(userIds: string[]) {
    forEach(userIds, (userId) => {
      if (!Types.ObjectId.isValid(userId)) {
        throw new NotFoundException('User not found');
      }
    });

    const users = await this.user_model.find({ _id: { $in: userIds } });
    if (users.length !== userIds.length) {
      throw new NotFoundException('User not found');
    }
  }

  async becomeAffiliate(userId: string): Promise<Partial<User>> {
    return this.updateUser(userId, { role: Role.AFFILIATE });
  }

  async updateUser(
    id: string,
    updateData: Partial<User>,
  ): Promise<Partial<User>> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user id');
    }

    const user = await this.user_model
      .findByIdAndUpdate(id, updateData, { new: true, lean: true })
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return convertObjectIdToString(user);
  }

  async findUsersNotFriends(
    userId: string,
    page: number = 1,
    limit: number = 20,
    existingFriendIds: string[] = [],
  ): Promise<Partial<User>[]> {
    const excludeIds = [userId, ...existingFriendIds];

    const users = await this.user_model
      .find({ _id: { $nin: excludeIds } })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec();

    return users.map((u) => ({
      ...u,
      id: u._id.toString(),
    }));
  }

  async findMany({
    filter = {},
    skip = 0,
    limit = 20,
  }: {
    filter?: any;
    skip?: number;
    limit?: number;
  }): Promise<User[]> {
    return this.user_model.find(filter).skip(skip).limit(limit).lean().exec();
  }
}
