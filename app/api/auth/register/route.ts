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
    const body = await request.text();
    console.log("Received raw request body:", body);

    let phoneNumber, password;
    try {
      const parsedBody = JSON.parse(body);
      phoneNumber = parsedBody.phoneNumber;
      password = parsedBody.password;
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

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
    let result;
    try {
      result = await sql`
        INSERT INTO users (phone_number, password)
        VALUES (${phoneNumber}, ${hashedPassword})
        RETURNING id, phone_number
      `;
    } catch (sqlError) {
      console.error("SQL Error:", sqlError);
      return NextResponse.json(
        { error: 'Database error occurred while creating user' },
        { status: 500 }
      );
    }

    if (!result || result.rows.length === 0) {
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
    const responseBody = JSON.stringify({ token });
    console.log("Sending response:", responseBody);
    return new NextResponse(responseBody, {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Registration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    const responseBody = JSON.stringify({ error: `Error creating user: ${errorMessage}` });
    console.log("Sending error response:", responseBody);
    return new NextResponse(responseBody, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
