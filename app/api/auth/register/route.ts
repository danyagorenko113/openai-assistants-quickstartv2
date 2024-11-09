import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(request: NextRequest) {
  console.log('Registration request received');
  try {
    const body = await request.json();
    console.log('Request body:', JSON.stringify(body));

    const { phoneNumber, password } = body;

    if (!phoneNumber || !password) {
      console.log('Missing phone number or password');
      return NextResponse.json(
        { error: 'Phone number and password are required' },
        { status: 400 }
      );
    }

    // Validate phone number format
    const phoneRegex = /^$$\d{3}$$\s\d{3}-\d{4}$/;
    if (!phoneRegex.test(phoneNumber)) {
      console.log('Invalid phone number format');
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      console.log('Password too short');
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Check if user already exists
    console.log('Checking if user exists');
    const existingUser = await sql`
      SELECT * FROM users WHERE phone_number = ${phoneNumber}
    `;

    if (existingUser.rows.length > 0) {
      console.log('User already exists');
      return NextResponse.json(
        { error: 'User with this phone number already exists' },
        { status: 400 }
      );
    }

    // Hash the password
    console.log('Hashing password');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    console.log('Creating new user');
    const result = await sql`
      INSERT INTO users (phone_number, password)
      VALUES (${phoneNumber}, ${hashedPassword})
      RETURNING id, phone_number
    `;

    const user = result.rows[0];

    // Generate JWT token
    console.log('Generating JWT token');
    const token = jwt.sign(
      { userId: user.id, phoneNumber: user.phone_number },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Registration successful');
    return NextResponse.json({ token }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Error creating user', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
