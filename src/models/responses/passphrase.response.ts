import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class PassphraseResponse {
  @ApiProperty({
    example: 'publickey',
    description: 'Publickey use to encrypt data',
  })
  @IsString()
  @IsNotEmpty()
  publickey: string;

  @ApiProperty({
    example: 'privatekey',
    description: 'privatekey to decrypt data',
  })
  @IsString()
  @IsNotEmpty()
  privatekey: string;
}
