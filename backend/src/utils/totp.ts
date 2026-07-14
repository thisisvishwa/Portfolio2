import crypto from 'crypto';

/**
 * Decodes a standard Base32 string into a binary Buffer.
 * Necessary for parsing TOTP secrets.
 */
export const decodeBase32 = (base32: string): Buffer => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleanString = base32.replace(/=+$/, '').toUpperCase();
  let length = cleanString.length;
  const buffer = Buffer.alloc(Math.floor((length * 5) / 8));
  
  let bits = 0;
  let value = 0;
  let index = 0;

  for (let i = 0; i < length; i++) {
    const val = alphabet.indexOf(cleanString.charAt(i));
    if (val === -1) throw new Error('Invalid Base32 characters in TOTP secret.');
    
    value = (value << 5) | val;
    bits += 5;

    if (bits >= 8) {
      bits -= 8;
      buffer[index++] = (value >>> bits) & 0xff;
    }
  }

  return buffer;
};

/**
 * Generates an HMAC-SHA1 HOTP token for a given key and counter buffer.
 */
export const generateHOTP = (secret: string, counter: number): string => {
  const key = decodeBase32(secret);
  const buffer = Buffer.alloc(8);
  
  // Write counter as 64-bit integer
  let temp = counter;
  for (let i = 7; i >= 0; i--) {
    buffer[i] = temp & 0xff;
    temp = temp >>> 8;
  }

  const hmac = crypto.createHmac('sha1', key);
  hmac.update(buffer);
  const hash = hmac.digest();

  // Dynamic truncation
  const offset = hash[hash.length - 1] & 0xf;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  const otp = binary % 1000000; // 6 digits limit
  return otp.toString().padStart(6, '0');
};

/**
 * Validates a TOTP code against a secret key, accounting for network latency clock drift.
 */
export const verifyTOTP = (
  secret: string,
  token: string,
  windowSteps = 1 // 1 step window = ±30 seconds clock drift allowance
): boolean => {
  const currentStep = Math.floor(Date.now() / 1000 / 30);

  for (let i = -windowSteps; i <= windowSteps; i++) {
    const computed = generateHOTP(secret, currentStep + i);
    if (computed === token) {
      return true;
    }
  }

  return false;
};

/**
 * Generates a random secure base32 TOTP secret string.
 */
export const generateTOTPSecret = (length = 16): string => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes = crypto.randomBytes(length);
  let secret = '';
  
  for (let i = 0; i < bytes.length; i++) {
    secret += alphabet.charAt(bytes[i] % alphabet.length);
  }
  
  return secret;
};
