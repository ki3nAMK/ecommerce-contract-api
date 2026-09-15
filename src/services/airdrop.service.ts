import { OrderType } from '@/enums/order-type.enum';
import { Role } from '@/enums/role.enum';
import { AirdropCampaign } from '@/models/entities/airdrop-campaign.entity';
import { Order } from '@/models/entities/order.entity';
import { AirdropCampaignsRepository } from '@/models/repos/airdrop-campaign.repo';
import { CreateAirdropCampaignDto } from '@/models/requests/create-airdrop-campaign.request';
import { BlockchainService } from '@/services/blockchain.service';
import { UsersService } from '@/services/user.service';
import { buildAirdropTree, getProofFor } from '@/utils/merkle.util';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ethers } from 'ethers';
import { Model, Types } from 'mongoose';

const COMMISSION_RATE = 0.02;

@Injectable()
export class AirdropService {
  constructor(
    private readonly airdropCampaignsRepository: AirdropCampaignsRepository,
    private readonly usersService: UsersService,
    private readonly blockchainService: BlockchainService,
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
  ) {}

  private async assertAdmin(userId: string): Promise<void> {
    const user = await this.usersService.getById(userId);
    if (!user || user.role !== Role.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }
  }

  async computeTopAffiliates(
    topN: number,
  ): Promise<{ userId: string; publicAddress: string }[]> {
    const orders = await this.orderModel
      .find({ referrer: { $ne: null } })
      .populate({ path: 'items.productId', model: 'Product' })
      .populate({ path: 'referrer', model: 'User', select: 'publicAddress' })
      .lean();

    const totals = new Map<string, { publicAddress: string; amount: number }>();

    for (const order of orders as any[]) {
      if (!order.referrer) continue;
      const referrerId = order.referrer._id.toString();

      for (const item of order.items) {
        if (item.status !== OrderType.DONE) continue;
        const price = item.productId?.price || 0;
        const commission = price * item.quantity * COMMISSION_RATE;

        const existing = totals.get(referrerId);
        if (existing) {
          existing.amount += commission;
        } else {
          totals.set(referrerId, {
            publicAddress: order.referrer.publicAddress,
            amount: commission,
          });
        }
      }
    }

    return Array.from(totals.entries())
      .sort((a, b) => b[1].amount - a[1].amount)
      .slice(0, topN)
      .map(([userId, { publicAddress }]) => ({ userId, publicAddress }));
  }

  async createCampaign(
    dto: CreateAirdropCampaignDto,
    adminUserId: string,
  ): Promise<AirdropCampaign> {
    await this.assertAdmin(adminUserId);

    const eligible = await this.computeTopAffiliates(dto.topN);
    const amountWei = ethers.parseEther(String(dto.rewardPerRecipientEth)).toString();

    const recipients = eligible.map((e) => ({
      userId: new Types.ObjectId(e.userId),
      publicAddress: e.publicAddress,
      amountWei,
      claimed: false,
    }));

    const { root } = buildAirdropTree(recipients);
    const totalAmountWei = (
      BigInt(amountWei) * BigInt(recipients.length)
    ).toString();

    const campaignId = (await this.airdropCampaignsRepository.findAll({})).count + 1;

    return this.airdropCampaignsRepository.create({
      name: dto.name,
      campaignId,
      merkleRoot: root,
      recipients,
      totalAmountWei,
      status: 'draft',
    });
  }

  async approveCampaign(
    campaignId: number,
    adminUserId: string,
  ): Promise<AirdropCampaign> {
    await this.assertAdmin(adminUserId);

    const campaign = await this.airdropCampaignsRepository.findOneByCampaignId(campaignId);
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    await this.blockchainService.setAirdropMerkleRoot(campaign.campaignId, campaign.merkleRoot);
    await this.blockchainService.fundAirdropCampaign(campaign.campaignId, campaign.totalAmountWei);

    return this.airdropCampaignsRepository.update(campaign.id, { status: 'active' });
  }

  async getMyAirdrops(userId: string): Promise<
    { campaignId: number; name: string; amountWei: string; proof: string[] }[]
  > {
    const campaigns = await this.airdropCampaignsRepository.findActiveForUser(userId);

    return campaigns.map((campaign) => {
      const { tree } = buildAirdropTree(campaign.recipients);
      const recipient = campaign.recipients.find(
        (r) => r.userId.toString() === userId,
      );
      const proof = getProofFor(tree, recipient.publicAddress, recipient.amountWei);

      return {
        campaignId: campaign.campaignId,
        name: campaign.name,
        amountWei: recipient.amountWei,
        proof,
      };
    });
  }

  async markClaimed(
    campaignId: number,
    userId: string,
    txHash: string,
  ): Promise<AirdropCampaign> {
    const campaign = await this.airdropCampaignsRepository.findOneByCampaignId(campaignId);
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const recipient = campaign.recipients.find((r) => r.userId.toString() === userId);
    if (!recipient) {
      throw new NotFoundException('You are not a recipient of this campaign');
    }

    recipient.claimed = true;
    recipient.txHash = txHash;

    return this.airdropCampaignsRepository.update(campaign.id, {
      recipients: campaign.recipients,
    });
  }
}
