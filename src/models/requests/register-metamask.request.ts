import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class MetamaskRegisterRequest {
  @ApiProperty({
    example: 'publicAddress',
    description: 'publicAddress',
  })
  @IsString()
  @IsNotEmpty()
  publicAddress: string;
}
