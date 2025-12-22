import { ErrorDictionary } from '@/enums/error-dictionary.enum';
import { AppRequest } from '@/interfaces/app-request.interface';
import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

export const CurrentUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const { currentUserId } = ctx.switchToHttp().getRequest<AppRequest>();

    if (!currentUserId) {
      throw new UnauthorizedException({
        code: ErrorDictionary.UNAUTHORIZED,
      });
    }

    return currentUserId;
  },
);
