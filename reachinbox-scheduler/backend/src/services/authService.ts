import { OAuth2Client, TokenPayload } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { UnauthorizedError } from '../utils/errors';
import { logger } from '../utils/logger';

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

interface GoogleUserInfo {
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

async function verifyGoogleToken(credential: string): Promise<GoogleUserInfo> {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const payload: TokenPayload | undefined = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) {
      throw new UnauthorizedError('Invalid Google token payload');
    }

    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      avatarUrl: payload.picture || null,
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    logger.error('[AUTH] Google token verification failed:', error);
    throw new UnauthorizedError('Failed to verify Google credentials');
  }
}

function generateJwt(userId: string, email: string): string {
  return jwt.sign({ userId, email }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

export async function authenticateWithGoogle(credential: string) {
  const googleUser = await verifyGoogleToken(credential);

  // Upsert user — create if new, update if returning
  const user = await prisma.user.upsert({
    where: { googleId: googleUser.googleId },
    update: {
      name: googleUser.name,
      email: googleUser.email,
      avatarUrl: googleUser.avatarUrl,
    },
    create: {
      googleId: googleUser.googleId,
      name: googleUser.name,
      email: googleUser.email,
      avatarUrl: googleUser.avatarUrl,
    },
  });

  logger.info(`[AUTH] User authenticated: ${user.email}`);

  const token = generateJwt(user.id, user.email);

  // Auto-create a default sender from Ethereal credentials if configured and user has no senders
  if (env.ETHEREAL_USER && env.ETHEREAL_PASSWORD) {
    const existingSender = await prisma.sender.findFirst({
      where: { userId: user.id },
    });

    if (!existingSender) {
      await prisma.sender.create({
        data: {
          userId: user.id,
          email: env.ETHEREAL_USER,
          etherealUser: env.ETHEREAL_USER,
          etherealPassword: env.ETHEREAL_PASSWORD,
        },
      });
      logger.info(`[AUTH] Default Ethereal sender created for ${user.email}`);
    }
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
    },
    token,
  };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  return user;
}
