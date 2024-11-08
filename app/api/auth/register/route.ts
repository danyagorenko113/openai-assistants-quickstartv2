import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set in environment variables');
}

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, password } = await request.json();

    if (!phoneNumber || !password) {
      return NextResponse.json(
        { error: 'Phone number and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await sql`
      SELECT * FROM users WHERE phone_number = ${phoneNumber}
    `;

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'User with this phone number already exists' },
        { status: 400 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new user
    const result = await sql`
      INSERT INTO users (phone_number, password)
      VALUES (${phoneNumber}, ${hashedPassword})
      RETURNING id, phone_number
    `;

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, phoneNumber: user.phone_number },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return NextResponse.json({ token }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Error creating user: ${error.message}` },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
