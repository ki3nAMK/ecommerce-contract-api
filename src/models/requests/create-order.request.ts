import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderItemDto {
  @ApiProperty({
    description: 'ID của sản phẩm (Product ObjectId)',
    example: '64f1a1c2b8e2f3d1a2b3c4d5',
  })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({
    description: 'Số lượng sản phẩm muốn đặt',
    example: 3,
  })
  @IsNumber()
  @IsPositive()
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({
    description: 'Danh sách các sản phẩm trong đơn hàng',
    type: [CreateOrderItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
