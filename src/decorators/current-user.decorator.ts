import { ExecutionContext } from '@nestjs/common';

import { AppRequest } from '@/interfaces/app-request.interface';
import { createParamDecorator } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AppRequest>();
    return request.currentUserId;
  },
);
