import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class MetamaskLoginRequest {
  @ApiProperty({
    example: 'signature',
    description: 'Signature use to encrypt data',
  })
  @IsString()
  @IsNotEmpty()
  signature: string;

  @ApiProperty({
    example: 'publicAddress',
    description: 'publicAddress',
  })
  @IsString()
  @IsNotEmpty()
  publicAddress: string;
}
