import { Request, Response, NextFunction } from 'express';
import {
  authenticateWithGoogle,
  authenticateDemoUser,
  getCurrentUser,
} from '../services/authService';
import { googleAuthSchema } from '../schemas/authSchema';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { ValidationError } from '../utils/errors';

export async function googleLogin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = googleAuthSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid Google credential');
    }

    const { user, token } = await authenticateWithGoogle(parsed.data.credential);

    // Set HTTP-only cookie for session persistence
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      data: { user, token },
      message: 'Authentication successful',
    });
  } catch (error) {
    next(error);
  }
}

export async function demoLogin(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { user, token } = await authenticateDemoUser();

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      data: { user, token },
      message: 'Demo authentication successful',
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await getCurrentUser(req.userId!);
    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(
  _req: AuthenticatedRequest,
  res: Response,
  _next: NextFunction
): Promise<void> {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
}
