import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    logger.error(`[ERROR] ${err.errorCode}: ${err.message}`);
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errorCode: err.errorCode,
    });
    return;
  }

  // Unexpected errors
  logger.error('[ERROR] Unhandled error:', err.message);
  
  const statusCode = 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message;

  res.status(statusCode).json({
    success: false,
    message,
    errorCode: 'INTERNAL_ERROR',
  });
}
