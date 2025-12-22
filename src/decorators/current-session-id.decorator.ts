import { ErrorDictionary } from '@/enums/error-dictionary.enum';
import { AppRequest } from '@/interfaces/app-request.interface';
import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

export const CurrentSessionId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const { currentSessionId } = ctx.switchToHttp().getRequest<AppRequest>();
    if (!currentSessionId) {
      throw new UnauthorizedException({
        code: ErrorDictionary.UNAUTHORIZED,
      });
    }
    return currentSessionId;
  },
);
