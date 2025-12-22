import { BaseRepositoryAbstract } from '@/base/abstract-repository.base';
import { BaseRepositoryInterface } from '@/base/repository.base';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersRepository
  extends BaseRepositoryAbstract<User>
  implements BaseRepositoryInterface<User>
{
  constructor(
    @InjectModel(User.name)
    private readonly users_repository: Model<User>,
  ) {
    super(users_repository);
  }

  async createMany(users: Partial<User>[]): Promise<User[]> {
    const docs = await this.users_repository.insertMany(users, { lean: true });
    return docs as User[];
  }
}
