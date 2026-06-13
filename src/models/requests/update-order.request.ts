import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsMongoId, IsOptional, IsBoolean } from 'class-validator';
import { OrderType } from '@/enums/order-type.enum';

export class UpdateItemStatusDto {
  @ApiProperty({
    description: 'Product id (Mongo ObjectId) của item trong order',
    example: '693047b3fd6ac6784eaaa5b9',
  })
  @IsNotEmpty()
  @IsMongoId()
  productId: string;

  @ApiProperty({
    description: 'Trạng thái mới cho item (OrderType enum)',
    enum: OrderType,
    example: OrderType.DEPOSIT_ESCROW,
    required: false,
  })
  @IsOptional()
  @IsEnum(OrderType)
  status?: OrderType;

  @ApiProperty({
    description: 'Đã verify bởi seller chưa',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isVerifyBySeller?: boolean;
}
