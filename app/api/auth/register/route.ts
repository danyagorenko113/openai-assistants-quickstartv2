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

    console.log("Received registration request for phone number:", phoneNumber);

    if (!phoneNumber || !password) {
      console.log("Missing phone number or password");
      return NextResponse.json(
        { error: 'Phone number and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    console.log("Checking if user already exists");
    const existingUser = await sql`
      SELECT * FROM users WHERE phone_number = ${phoneNumber}
    `;

    if (existingUser.rows.length > 0) {
      console.log("User already exists");
      return NextResponse.json(
        { error: 'User with this phone number already exists' },
        { status: 400 }
      );
    }

    // Hash the password
    console.log("Hashing password");
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new user
    console.log("Creating new user");
    const result = await sql`
      INSERT INTO users (phone_number, password)
      VALUES (${phoneNumber}, ${hashedPassword})
      RETURNING id, phone_number
    `;

    if (result.rows.length === 0) {
      console.error("User insertion failed: No rows returned");
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    const user = result.rows[0];

    // Generate JWT token
    console.log("Generating JWT token");
    const token = jwt.sign(
      { userId: user.id, phoneNumber: user.phone_number },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log("User registered successfully");
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
