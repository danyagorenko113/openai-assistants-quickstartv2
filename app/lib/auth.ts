import { query } from './db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function createUser(email: string, password: string) {
  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await query(
    'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id',
    [email, hashedPassword]
  );
  return result.rows[0];
}

export async function validateUser(email: string, password: string) {
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  if (user && await bcrypt.compare(password, user.password)) {
    return user;
  }
  return null;
}

export function generateToken(userId: number) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1d' });
}

export function verifyToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded as { userId: number };
  } catch (error) {
    return null;
  }
}
