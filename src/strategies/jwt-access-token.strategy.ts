import { ACCESS_TOKEN_PUBLIC_KEY } from '@/constraints/jwt.constraint';
import { ErrorDictionary } from '@/enums/error-dictionary.enum';
import { Role } from '@/enums/role.enum';
import { SessionType } from '@/enums/session-type.enum';
import { AppRequest } from '@/interfaces/app-request.interface';
import { TokenPayload } from '@/interfaces/token-payload.interface';
import { UsersRepository } from '@/models/repos/user.repo';
import { SessionService } from '@/services/session.service';
import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtAccessTokenStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly sessionService: SessionService,
    private readonly userRepository: UsersRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: true,
      secretOrKey: ACCESS_TOKEN_PUBLIC_KEY,
      passReqToCallback: true,
    });
  }

  async validate(req: AppRequest, { id }: TokenPayload) {
    const { sessionId, userId } = await this.sessionService.verifySession(
      id,
      SessionType.ACCESS,
    );

    if (req.adminRoute || !req.skipVerification) {
      const user = await this.userRepository.findOneById(userId);

      if (!user) {
        throw new UnauthorizedException({
          code: ErrorDictionary.UNAUTHORIZED,
        });
      }

      if (req.adminRoute) {
        if (user.role !== Role.ADMIN) {
          throw new ForbiddenException({
            code: ErrorDictionary.FORBIDDEN,
          });
        }
      }
    }

    req.currentUserId = userId;
    req.currentSessionId = sessionId;

    return true;
  }
}
