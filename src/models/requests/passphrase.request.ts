import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class PassphraseRequest {
  @ApiProperty({
    example: 'passphrase',
    description: 'Passphrase use to encrypt data',
  })
  @IsString()
  @IsNotEmpty()
  passphrase: string;
}
