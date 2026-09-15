import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ description: 'Số sao đánh giá (1-5)', example: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ description: 'Nội dung bình luận', example: 'Sản phẩm rất tốt!' })
  @IsString()
  @IsNotEmpty()
  comment: string;
}
