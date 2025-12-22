import { SetMetadata } from '@nestjs/common';

export const SKIP_VERIFICATION_KEY = 'skip-verification';

export const SkipVerification = () => SetMetadata(SKIP_VERIFICATION_KEY, true);
