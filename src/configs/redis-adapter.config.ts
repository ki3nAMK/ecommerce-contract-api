import { ErrorDictionary } from '@/enums/error-dictionary.enum';
import { Role } from '@/enums/role.enum';
import { SessionType } from '@/enums/session-type.enum';
import { SocketNamespace } from '@/enums/socket-namespace.enum';
import { CustomSocket } from '@/interfaces/socket.interface';
import { CacheDomain } from '@/services/cache.service';
import { SessionService } from '@/services/session.service';
import { UsersService } from '@/services/user.service';
import {
  HttpStatus,
  INestApplicationContext,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { NextFunction } from 'express';
import { get, isNil } from 'lodash';
import { Server, ServerOptions } from 'socket.io';

export class RedisIoAdapter extends IoAdapter {
  logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter>;

  constructor(
    private app: INestApplicationContext,
    private readonly cacheDomain: CacheDomain,
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const pubClient = this.cacheDomain.getRedisClient();
    const subClient = pubClient.duplicate();

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createTokenMiddleware(
    sessionService: SessionService,
    userService: UsersService,
    role?: Role,
  ) {
    return async (socket: CustomSocket, next: NextFunction) => {
      const token = get(socket, 'handshake.query.token', '') as string;

      if (!token) {
        next(
          new UnauthorizedException({
            code: ErrorDictionary.UNAUTHORIZED,
            statusCode: HttpStatus.UNAUTHORIZED,
          }),
        );

        return;
      }

      try {
        const { sessionId, userId } = await sessionService.verifyToken(
          token,
          SessionType.ACCESS,
        );

        if (isNil(sessionId) || isNil(userId)) {
          next(
            new UnauthorizedException({
              code: ErrorDictionary.UNAUTHORIZED,
              statusCode: HttpStatus.UNAUTHORIZED,
            }),
          );

          return;
        }

        if (role) {
          const user = await userService.getById(userId);
          if (!user.id) {
            next(
              new UnauthorizedException({
                code: ErrorDictionary.UNAUTHORIZED,
              }),
            );

            return;
          }

          if (user.role !== role) {
            next(
              new UnauthorizedException({
                code: ErrorDictionary.FORBIDDEN,
              }),
            );

            return;
          }
        }

        socket.handshake.currentSessionId = sessionId;
        socket.handshake.currentUserId = userId;
        socket.handshake.token = token;

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server: Server = super.createIOServer(port, options);

    const usersService = this.app.get(UsersService);
    const sessionService = this.app.get(SessionService);

    server
      .of(SocketNamespace.CLIENT)
      .use(
        this.createTokenMiddleware(sessionService, usersService, Role.CLIENT),
      );

    server.adapter(this.adapterConstructor);

    return server;
  }
}
