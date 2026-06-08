import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string } | null;
      permissionContext?: {
        action: string;
        scopeType: string;
        scopeId: string;
        userId: string;
      };
    }
  }
}
