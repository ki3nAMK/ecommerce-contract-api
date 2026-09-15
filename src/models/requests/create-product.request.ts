import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

class LabelDto {
  @ApiProperty()
  enabled: boolean;

  @ApiProperty()
  @IsString()
  content: string;
}

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  subDescription?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  gender: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  colors: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  sizes: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @ApiProperty({ type: [String], description: 'Uploaded image URLs' })
  @IsArray()
  @IsString({ each: true })
  images: string[];

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiProperty({ description: 'Per-unit escrow deposit amount, must be <= price' })
  @IsNumber()
  @IsPositive()
  escrow: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  priceSale?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  taxes?: number;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiProperty({ required: false, type: LabelDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LabelDto)
  newLabel?: LabelDto;

  @ApiProperty({ required: false, type: LabelDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LabelDto)
  saleLabel?: LabelDto;
}
