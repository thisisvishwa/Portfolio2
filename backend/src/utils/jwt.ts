import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { logger } from './logger';

export interface TokenPayload {
  userId: string;
  role: string;
  fingerprint: string;
  [key: string]: unknown; // satisfy jwt.sign indexing
}

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'fallback_access_secret_12345';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_12345';

/**
 * Generates an Access Token (short lifespan)
 */
export const generateAccessToken = (payload: TokenPayload): string => {
  const options: jwt.SignOptions = {
    expiresIn: (process.env.JWT_ACCESS_EXPIRY || '15m') as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign(payload as object, ACCESS_SECRET as jwt.Secret, options);
};

/**
 * Generates a Refresh Token (long lifespan)
 */
export const generateRefreshToken = (payload: TokenPayload): string => {
  const options: jwt.SignOptions = {
    expiresIn: (process.env.JWT_REFRESH_EXPIRY || '7d') as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign(payload as object, REFRESH_SECRET as jwt.Secret, options);
};

/**
 * Verifies the validity of an Access Token
 */
export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, ACCESS_SECRET as jwt.Secret) as TokenPayload;
};

/**
 * Verifies the validity of a Refresh Token
 */
export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, REFRESH_SECRET as jwt.Secret) as TokenPayload;
};

/**
 * Attaches the Refresh Token securely inside an HttpOnly, SameSite cookie.
 */
export const setRefreshTokenCookie = (res: Response, refreshToken: string): void => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction, // Secure (HTTPS only) in production
    sameSite: 'strict',   // Mitigates CSRF completely
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days matching token lifespan
    signed: true,         // Cryptographically signed cookie to prevent alteration
  });
  logger.debug('Refresh Token Cookie attached successfully.');
};

/**
 * Clears the secure Refresh Token cookie.
 */
export const clearRefreshTokenCookie = (res: Response): void => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
};
