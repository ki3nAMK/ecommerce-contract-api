import {
  ThrottlerGuard,
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { isNil } from 'lodash';
import { Reflector } from '@nestjs/core';
import { THROTTLER_OPTIONS } from '@nestjs/throttler/dist/throttler.constants';
import { AppRequest } from '@/interfaces/app-request.interface';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  constructor(
    @Inject(THROTTLER_OPTIONS) options: ThrottlerModuleOptions,
    protected storageService: ThrottlerStorage,
    protected reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  protected async getTracker(req: AppRequest): Promise<string> {
    return Promise.resolve(
      !isNil(req.currentUserId) ? req.currentUserId : req.ip,
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const throttleMetadata = this.reflector.getAllAndOverride('throttle', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!throttleMetadata) {
      return true;
    }

    return super.canActivate(context);
  }
}
