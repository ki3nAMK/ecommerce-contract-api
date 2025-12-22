import { REFRESH_TOKEN_PUBLIC_KEY } from '@/constraints/jwt.constraint';
import { SessionType } from '@/enums/session-type.enum';
import { AppRequest } from '@/interfaces/app-request.interface';
import { TokenPayload } from '@/interfaces/token-payload.interface';
import { SessionService } from '@/services/session.service';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtRefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh-token',
) {
  constructor(private readonly sessionService: SessionService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: true,
      secretOrKey: REFRESH_TOKEN_PUBLIC_KEY,
      passReqToCallback: true,
    });
  }

  async validate(req: AppRequest, { id }: TokenPayload) {
    const { sessionId, userId } = await this.sessionService.verifySession(
      id,
      SessionType.REFRESH,
    );

    req.currentUserId = userId;
    req.currentSessionId = sessionId.toString();

    return true;
  }
}
