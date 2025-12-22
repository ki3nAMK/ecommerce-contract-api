import { CurrentSession, CurrentToken, CurrentUser } from '@/decorators';
import { SessionType } from '@/enums/session-type.enum';
import { JwtAccessTokenGuard } from '@/guards';
import { User } from '@/models/entities/user.entity';
import { LoginRequest } from '@/models/requests/login.request';
import { MetamaskLoginRequest } from '@/models/requests/metamask.request';
import { MetamaskRegisterRequest } from '@/models/requests/register-metamask.request';
import { RegisterRequest } from '@/models/requests/register.request';
import { LoginResponse } from '@/models/responses/login.response';
import { OkResponse } from '@/models/responses/ok.response';
import { RegisterResponse } from '@/models/responses/register.response';
import { AuthService } from '@/services/auth.service';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create new account' })
  @ApiBody({ type: RegisterRequest })
  @ApiResponse({ status: 201 })
  async register(
    @Body() dto: MetamaskRegisterRequest,
  ): Promise<{ data: User }> {
    return {
      data: await this.authService.registerNewAccountWithMetamask(dto),
    };
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login for access/refresh token' })
  @ApiBody({ type: LoginRequest })
  @ApiResponse({ status: 200, type: LoginResponse })
  async login(@Body() dto: MetamaskLoginRequest): Promise<LoginResponse> {
    return this.authService.loginWithMetamask(dto);
  }

  @ApiBearerAuth(SessionType.ACCESS)
  @ApiOkResponse({
    type: () => OkResponse,
  })
  @ApiOperation({ summary: 'Logout and revoke the token' })
  @UseGuards(JwtAccessTokenGuard)
  @HttpCode(HttpStatus.OK)
  @Post('/sign-out')
  async logout(
    @CurrentUser() userId: string,
    @CurrentSession() sessionId: string,
    @CurrentToken() token: string,
  ): Promise<OkResponse> {
    const result = await this.authService.logout(userId, sessionId, token);
    return result;
  }
}
