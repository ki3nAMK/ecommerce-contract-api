import { BaseServiceAbstract } from '@/base/abstract-service.base';
import {
  ACCESS_TOKEN_PRIVATE_KEY,
  ACCESS_TOKEN_PUBLIC_KEY,
  REFRESH_TOKEN_PRIVATE_KEY,
  REFRESH_TOKEN_PUBLIC_KEY,
} from '@/constraints/jwt.constraint';
import { ErrorDictionary } from '@/enums/error-dictionary.enum';
import { SessionType } from '@/enums/session-type.enum';
import { TokenPayload } from '@/interfaces/token-payload.interface';
import { Session } from '@/models/entities/session.entity';
import { SessionsRepository } from '@/models/repos/session.repo';
import { currentTime } from '@/utils/helper';
import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { addDays, isAfter } from 'date-fns';
import { Types } from 'mongoose';
import { CacheDomain } from './cache.service';
import { RedisKey } from '@/enums/redis-key.enum';

@Injectable()
export class SessionService extends BaseServiceAbstract<Session> {
  logger = new Logger(SessionService.name);

  constructor(
    private readonly sessions_repository: SessionsRepository,
    private readonly jwtService: JwtService,
    private readonly cacheDomain: CacheDomain,
    private readonly configService: ConfigService,
  ) {
    super(sessions_repository);
  }

  async gen(userId: string): Promise<{
    accessToken: string;
    refreshToken: string;
    accessExpiresAt: Date;
    refreshExpiresAt: Date;
  }> {
    const sessionId = new Types.ObjectId().toString();

    const payload = { id: sessionId };

    const accessTokenExpiresIn = this.configService.get<number>(
      'jwt.accessTokenExpiresIn',
    );
    const refreshTokenExpiresIn = this.configService.get<number>(
      'jwt.refreshTokenExpiresIn',
    );

    const accessToken = this.jwtService.sign(payload, {
      algorithm: 'RS256',
      privateKey: ACCESS_TOKEN_PRIVATE_KEY,
      expiresIn: `${accessTokenExpiresIn}d`,
    });

    const refreshToken = this.jwtService.sign(payload, {
      algorithm: 'RS256',
      privateKey: REFRESH_TOKEN_PRIVATE_KEY,
      expiresIn: `${refreshTokenExpiresIn}d`,
    });

    const refreshExpiresAt = addDays(currentTime(), accessTokenExpiresIn);
    const accessExpiresAt = addDays(currentTime(), refreshTokenExpiresIn);

    const userObjectId = Types.ObjectId.isValid(userId)
      ? new Types.ObjectId(userId)
      : null;
    if (!userObjectId) {
      this.logger.error(`Invalid userId format: ${userId}`);
      throw new BadRequestException('Invalid userId format');
    }

    const promises = [
      this.sessions_repository.create({
        _id: new Types.ObjectId(sessionId),
        expiresAt: accessExpiresAt,
        user: userObjectId,
      }),
      this.cacheDomain
        .getCacheManager()
        .set(
          `${RedisKey.ACCESS_SESSIONS}:sessionId-${sessionId}`,
          userId,
          accessTokenExpiresIn * 24 * 60 * 60 * 1000,
        ),
      this.cacheDomain
        .getCacheManager()
        .set(
          `${RedisKey.REFRESH_SESSIONS}:sessionId-${sessionId}`,
          userId,
          refreshTokenExpiresIn * 24 * 60 * 60 * 1000,
        ),
      this.cacheDomain
        .getRedisClient()
        .sadd(`${RedisKey.SESSIONS}:userId-${userId}`, sessionId),
    ];

    await Promise.all(promises);

    return {
      accessToken,
      refreshToken,
      accessExpiresAt,
      refreshExpiresAt,
    };
  }

  async delete({
    userId,
    sessionId,
    accessToken,
    refreshToken,
  }: {
    userId: string;
    sessionId: string;
    accessToken?: string;
    refreshToken?: string;
  }) {
    const promises = [
      this.cacheDomain
        .getCacheManager()
        .del(`${RedisKey.ACCESS_SESSIONS}:sessionId-${sessionId}`),
      this.cacheDomain
        .getCacheManager()
        .del(`${RedisKey.REFRESH_SESSIONS}:sessionId-${sessionId}`),
      this.cacheDomain
        .getRedisClient()
        .srem(`${RedisKey.SESSIONS}:userId-${userId}`, sessionId),
      this.cacheDomain
        .getRedisClient()
        .sadd(RedisKey.BLACK_LIST_SESSIONS, sessionId),
      this.sessions_repository.softDelete(sessionId),
    ];

    if (accessToken) {
      promises.push(
        this.cacheDomain
          .getRedisClient()
          .sadd(RedisKey.BLACK_LIST_ACCESS_TOKENS, accessToken),
      );
    }

    if (refreshToken) {
      promises.push(
        this.cacheDomain
          .getRedisClient()
          .sadd(RedisKey.BLACK_LIST_REFRESH_TOKENS, refreshToken),
      );
    }

    await Promise.all(promises);
  }

  async verifySession(
    sessionId: string,
    type: SessionType,
  ): Promise<{
    sessionId: string;
    userId: string;
  }> {
    const isBlackList = await this.cacheDomain
      .getRedisClient()
      .sismember(RedisKey.BLACK_LIST_SESSIONS, sessionId);

    if (isBlackList) {
      throw new UnauthorizedException({
        code: ErrorDictionary.UNAUTHORIZED,
      });
    }

    const sessionKeyPrefix =
      type === SessionType.ACCESS
        ? RedisKey.ACCESS_SESSIONS
        : RedisKey.REFRESH_SESSIONS;

    const userId = await this.cacheDomain
      .getCacheManager()
      .get<string>(`${sessionKeyPrefix}:sessionId-${sessionId}`);

    if (!userId) {
      const session = await this.sessions_repository.findOneByCondition(
        {
          _id: new Types.ObjectId(sessionId),
        },
        'user',
      );

      if (!session || !session.user) {
        await this.cacheDomain
          .getRedisClient()
          .sadd(RedisKey.BLACK_LIST_SESSIONS, sessionId);
        throw new UnauthorizedException({
          code: ErrorDictionary.UNAUTHORIZED,
        });
      }

      if (this.isExpired(session)) {
        await Promise.all([
          this.sessions_repository.softDelete(sessionId),
          this.cacheDomain
            .getRedisClient()
            .sadd(RedisKey.BLACK_LIST_SESSIONS, sessionId),
          this.cacheDomain
            .getCacheManager()
            .del(`${sessionKeyPrefix}:sessionId-${sessionId}`),
        ]);

        throw new UnauthorizedException({
          code: ErrorDictionary.UNAUTHORIZED,
        });
      }

      await this.cacheDomain
        .getCacheManager()
        .set(
          `${sessionKeyPrefix}:sessionId-${sessionId}`,
          session.user.id,
          session.expiresAt.getTime() - Date.now(),
        );

      return { sessionId: session.id, userId: session.user._id.toString() };
    }

    return { sessionId, userId };
  }

  async verifyToken(token: string, type: SessionType) {
    const blackListKey =
      type === SessionType.ACCESS
        ? RedisKey.BLACK_LIST_ACCESS_TOKENS
        : RedisKey.BLACK_LIST_REFRESH_TOKENS;

    try {
      const publicKey =
        type === SessionType.ACCESS
          ? ACCESS_TOKEN_PUBLIC_KEY
          : REFRESH_TOKEN_PUBLIC_KEY;

      const existingBlackList = await this.cacheDomain
        .getRedisClient()
        .sismember(blackListKey, token);

      if (existingBlackList) {
        throw new UnauthorizedException({
          code: ErrorDictionary.UNAUTHORIZED,
        });
      }

      const { id }: TokenPayload = await this.jwtService.verifyAsync(token, {
        publicKey,
        ignoreExpiration: false,
      });

      const result = await this.verifySession(id, type);
      return result;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      await this.cacheDomain.getRedisClient().sadd(blackListKey, token);
      throw new UnauthorizedException({
        code: ErrorDictionary.UNAUTHORIZED,
      });
    }
  }

  isExpired(session: Session): boolean {
    return isAfter(currentTime(), session.expiresAt);
  }
}
