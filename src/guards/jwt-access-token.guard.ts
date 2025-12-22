import { IS_PUBLIC_ROUTE_KEY } from '@/decorators';
import { SKIP_VERIFICATION_KEY } from '@/decorators/skip-verification.decorator';
import { AppRequest } from '@/interfaces/app-request.interface';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAccessTokenGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic =
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_ROUTE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || false;

    const skipVerification =
      this.reflector.getAllAndOverride<boolean>(SKIP_VERIFICATION_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || false;

    const request = context.switchToHttp().getRequest<AppRequest>();
    request.skipVerification = skipVerification;

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}
