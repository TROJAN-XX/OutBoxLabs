import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError } from '../utils/errors';
import { prisma } from '../config/database';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
  };
}

interface JwtPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.token;
    
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : cookieToken;

    if (!token) {
      throw new UnauthorizedError('No authentication token provided');
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, avatarUrl: true },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    req.userId = user.id;
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid or expired token'));
    } else {
      next(new UnauthorizedError('Authentication failed'));
    }
  }
}
