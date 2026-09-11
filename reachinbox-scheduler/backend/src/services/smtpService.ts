import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { SmtpError } from '../utils/errors';
import { logger } from '../utils/logger';

interface SmtpCredentials {
  host: string;
  port: number;
  user: string;
  password: string;
}

interface SendEmailParams {
  from: string;
  to: string;
  subject: string;
  body: string;
  credentials: SmtpCredentials;
}

interface SendResult {
  messageId: string;
  previewUrl: string | null;
}

// Cache transporter instances by sender credentials to reuse connections
const transporterCache = new Map<string, nodemailer.Transporter>();

function getTransporter(credentials: SmtpCredentials): nodemailer.Transporter {
  const cacheKey = `${credentials.host}:${credentials.port}:${credentials.user}`;
  
  let transporter = transporterCache.get(cacheKey);
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: credentials.host,
      port: credentials.port,
      secure: false, // Ethereal uses STARTTLS on port 587
      auth: {
        user: credentials.user,
        pass: credentials.password,
      },
      tls: {
        rejectUnauthorized: false, // Ethereal may use self-signed certs
      },
    });
    transporterCache.set(cacheKey, transporter);
  }
  
  return transporter;
}

export async function sendEmail(params: SendEmailParams): Promise<SendResult> {
  const { from, to, subject, body, credentials } = params;

  try {
    const transporter = getTransporter(credentials);

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html: body,
      text: body.replace(/<[^>]*>/g, ''), // Strip HTML for plain text
    });

    // Ethereal provides a preview URL for sent messages
    const previewUrl = nodemailer.getTestMessageUrl(info) || null;

    logger.info(`[SMTP] Email sent to ${to}, messageId=${info.messageId}`);
    if (previewUrl) {
      logger.info(`[SMTP] Ethereal preview: ${previewUrl}`);
    }

    return {
      messageId: info.messageId,
      previewUrl: typeof previewUrl === 'string' ? previewUrl : null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown SMTP error';
    logger.error(`[SMTP] Failed to send email to ${to}: ${message}`);
    throw new SmtpError(`SMTP delivery failed: ${message}`);
  }
}

export function buildDefaultCredentials(): SmtpCredentials {
  return {
    host: env.ETHEREAL_HOST,
    port: env.ETHEREAL_PORT,
    user: env.ETHEREAL_USER,
    password: env.ETHEREAL_PASSWORD,
  };
}

export function buildSenderCredentials(sender: {
  etherealUser: string;
  etherealPassword: string;
}): SmtpCredentials {
  return {
    host: env.ETHEREAL_HOST,
    port: env.ETHEREAL_PORT,
    user: sender.etherealUser,
    password: sender.etherealPassword,
  };
}

export async function verifySmtpConnection(credentials: SmtpCredentials): Promise<boolean> {
  try {
    const transporter = getTransporter(credentials);
    await transporter.verify();
    logger.info('[SMTP] Connection verified');
    return true;
  } catch (error) {
    logger.error('[SMTP] Connection verification failed:', error);
    return false;
  }
}
