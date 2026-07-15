import type { NextFunction, Request, Response } from 'express';

export function authorize(_roles: string[]) {
  return (_req: Request, _res: Response, next: NextFunction) => {
    next();
  };
}
