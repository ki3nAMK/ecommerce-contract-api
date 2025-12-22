import { Request } from 'express';

export type AppRequest = Request & {
  currentUserId: string;
  currentSessionId: string;
  skipVerification: boolean;
  adminRoute: boolean;
  token: string;
};
