import { AppRequest } from '@/interfaces/app-request.interface';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentSession = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AppRequest>();
    return request.currentSessionId;
  },
);
