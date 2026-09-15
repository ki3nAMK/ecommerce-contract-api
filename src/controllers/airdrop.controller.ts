import { CurrentUserId } from '@/decorators';
import { SessionType } from '@/enums/session-type.enum';
import { AdminGuard, JwtAccessTokenGuard } from '@/guards';
import { CreateAirdropCampaignDto } from '@/models/requests/create-airdrop-campaign.request';
import { AirdropService } from '@/services/airdrop.service';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiBearerAuth(SessionType.ACCESS)
@ApiTags('Admin Airdrop')
@Controller('admin/airdrop')
@UseGuards(JwtAccessTokenGuard, AdminGuard)
export class AdminAirdropController {
  constructor(private readonly airdropService: AirdropService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo chiến dịch airdrop (draft)' })
  async createCampaign(
    @Body() dto: CreateAirdropCampaignDto,
    @CurrentUserId() adminUserId: string,
  ) {
    return this.airdropService.createCampaign(dto, adminUserId);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Duyệt chiến dịch: công bố merkle root và nạp quỹ on-chain' })
  async approveCampaign(
    @Param('id') campaignId: string,
    @CurrentUserId() adminUserId: string,
  ) {
    return this.airdropService.approveCampaign(Number(campaignId), adminUserId);
  }
}

@ApiBearerAuth(SessionType.ACCESS)
@ApiTags('Airdrop')
@Controller('airdrop')
@UseGuards(JwtAccessTokenGuard)
export class AirdropController {
  constructor(private readonly airdropService: AirdropService) {}

  @Get('me')
  @ApiOperation({ summary: 'Danh sách airdrop khả dụng của tôi' })
  async getMyAirdrops(@CurrentUserId() userId: string) {
    return this.airdropService.getMyAirdrops(userId);
  }

  @Patch('claims/:campaignId')
  @ApiOperation({ summary: 'Đồng bộ trạng thái đã claim sau khi giao dịch on-chain thành công' })
  async markClaimed(
    @Param('campaignId') campaignId: string,
    @Body('txHash') txHash: string,
    @CurrentUserId() userId: string,
  ) {
    return this.airdropService.markClaimed(Number(campaignId), userId, txHash);
  }
}
