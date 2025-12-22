import { BaseRepositoryAbstract } from '@/base/abstract-repository.base';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Session } from '../entities/session.entity';

@Injectable()
export class SessionsRepository extends BaseRepositoryAbstract<Session> {
  constructor(
    @InjectModel(Session.name)
    private readonly sessions_repository: Model<Session>,
  ) {
    super(sessions_repository);
  }
}
