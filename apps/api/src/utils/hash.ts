import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function hashToken(token: string) {
  return bcrypt.hash(token, SALT_ROUNDS);
}

export function compareToken(token: string, hash: string) {
  return bcrypt.compare(token, hash);
}
