import { ErrorDictionary } from '@/enums/error-dictionary.enum';
import { LoginRequest } from '@/models/requests/login.request';
import { MetamaskRegisterRequest } from '@/models/requests/register-metamask.request';
import { RegisterRequest } from '@/models/requests/register.request';
import { LoginResponse } from '@/models/responses/login.response';
import { RegisterResponse } from '@/models/responses/register.response';
import { OK_RESPONSE } from '@/utils/constants';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { isEmpty, isNil } from 'lodash';
import { SessionService } from './session.service';
import { UsersService } from './user.service';
import { MetamaskLoginRequest } from '@/models/requests/metamask.request';
import { bufferToHex } from 'ethereumjs-util';
import { recoverPersonalSignature } from 'eth-sig-util';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private readonly sessionService: SessionService,
  ) {}

  async register(dto: RegisterRequest): Promise<RegisterResponse> {
    const { email } = dto;

    const isTakenEmail = await this.userService.isTakenEmail(email);
    if (isTakenEmail) {
      throw new ConflictException({
        code: ErrorDictionary.EMAIL_ALREADY_TAKEN,
      });
    }

    const { userId } = await this.userService.createUser(dto);

    const { accessExpiresAt, accessToken, refreshExpiresAt, refreshToken } =
      await this.sessionService.gen(userId);

    return {
      accessToken,
      refreshToken,
      accessExpiresAt,
      refreshExpiresAt,
    };
  }

  async login({ username, password }: LoginRequest): Promise<LoginResponse> {
    const user = await this.userService.getByUsername(username);

    if (isEmpty(user)) {
      throw new UnauthorizedException({
        code: ErrorDictionary.USERNAME_OR_PASSWORD_INCORRECT,
      });
    }

    const isPasswordCorrect = await this.userService.comparePassword(
      password,
      user,
    );

    if (!isPasswordCorrect) {
      throw new UnauthorizedException({
        code: ErrorDictionary.USERNAME_OR_PASSWORD_INCORRECT,
      });
    }

    const result = await this.sessionService.gen(user.id);

    return result;
  }

  async logout(userId: string, sessionId: string, token: string) {
    await this.sessionService.delete({ sessionId, userId, accessToken: token });
    return OK_RESPONSE;
  }

  async loginWithMetamask(req: MetamaskLoginRequest) {
    const { signature, publicAddress } = req;

    const user = await this.userService.getByPublicAddress(publicAddress);

    if (isNil(user)) {
      throw new BadRequestException(ErrorDictionary.USER_IS_NOT_EXIST);
    }

    const msg = `I am signing my one-time nonce: ${user.nonce}`;
    const msgBufferHex = bufferToHex(Buffer.from(msg, 'utf8'));
    const address = recoverPersonalSignature({
      data: msgBufferHex,
      sig: signature,
    });

    if (address.toLowerCase() !== publicAddress.toLowerCase()) {
      throw new BadRequestException(ErrorDictionary.SIGNATURE_VALIDATION_FAIL);
    }

    const newUser = await this.userService.updateUser(user._id.toString(), {
      nonce: Math.floor(Math.random() * 10000),
    });

    const result = await this.sessionService.gen(user.id);
    return {
      ...result,
      user: newUser,
    };
  }

  async registerNewAccountWithMetamask(req: MetamaskRegisterRequest) {
    const prevUser = await this.userService.getByPublicAddress(
      req.publicAddress,
    );

    if (!isNil(prevUser)) {
      return prevUser;
    }

    const user = await this.userService.createUserWithPublicAddress(req);
    return user;
  }
}
