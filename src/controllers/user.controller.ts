import { CurrentUserId, SkipVerification } from '@/decorators';
import { SessionType } from '@/enums/session-type.enum';
import { JwtAccessTokenGuard } from '@/guards';
import { User } from '@/models/entities/user.entity';
import { UsersService } from '@/services/user.service';
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

@ApiBearerAuth(SessionType.ACCESS)
@ApiTags('Users')
@UseGuards(JwtAccessTokenGuard)
@Controller({
  path: 'users',
  version: '1',
})
export class UserController {
  constructor(private readonly userService: UsersService) {}

  @ApiOkResponse({ type: () => User })
  @HttpCode(HttpStatus.OK)
  @SkipVerification()
  @Get('/me')
  async getMe(@CurrentUserId() userId: string) {
    const result = await this.userService.getById(userId);
    return result;
  }
}
