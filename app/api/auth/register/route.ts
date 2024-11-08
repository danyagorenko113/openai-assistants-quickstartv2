import { NextRequest, NextResponse } from 'next/server';
import { createUser, generateToken } from '@/app/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    const user = await createUser(email, password);
    const token = generateToken(user.id);
    return NextResponse.json({ token }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error creating user' },
      { status: 500 }
    );
  }
}
