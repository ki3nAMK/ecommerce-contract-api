import { BaseRepositoryAbstract } from '@/base/abstract-repository.base';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AirdropCampaign } from '../entities/airdrop-campaign.entity';

@Injectable()
export class AirdropCampaignsRepository extends BaseRepositoryAbstract<AirdropCampaign> {
  constructor(
    @InjectModel(AirdropCampaign.name)
    private readonly airdrop_campaigns_repository: Model<AirdropCampaign>,
  ) {
    super(airdrop_campaigns_repository);
  }

  findOneByCampaignId(campaignId: number) {
    return this.airdrop_campaigns_repository.findOne({ campaignId }).exec();
  }

  findActiveForUser(userId: string) {
    return this.airdrop_campaigns_repository
      .find({
        status: 'active',
        recipients: {
          $elemMatch: { userId: new Types.ObjectId(userId), claimed: false },
        },
      })
      .exec();
  }
}
