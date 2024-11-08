import { NextRequest, NextResponse } from 'next/server';
import { validateUser, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    const user = await validateUser(email, password);
    
    if (user) {
      const token = generateToken(user.id);
      return NextResponse.json({ token });
    } else {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Error logging in' },
      { status: 500 }
    );
  }
}
