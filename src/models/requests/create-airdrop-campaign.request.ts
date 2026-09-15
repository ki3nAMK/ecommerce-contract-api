import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsPositive, IsString, Min } from 'class-validator';

export class CreateAirdropCampaignDto {
  @ApiProperty({ description: 'Tên chiến dịch', example: 'Top affiliate tháng 9' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Số lượng affiliate được thưởng (xếp theo hoa hồng đã kiếm)', example: 3 })
  @IsInt()
  @Min(1)
  topN: number;

  @ApiProperty({ description: 'Số ETH thưởng cố định cho mỗi người', example: 0.05 })
  @IsNumber()
  @IsPositive()
  rewardPerRecipientEth: number;
}
