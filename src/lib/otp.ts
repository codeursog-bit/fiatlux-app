/**
 * Generates a random 6-digit OTP code as a string.
 */
export function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
