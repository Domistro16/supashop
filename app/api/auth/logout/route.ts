import { NextRequest, NextResponse } from 'next/server';
import { revokeRefreshToken } from '@server/backend/token';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refreshToken')?.value;

    if (refreshToken) {
      // Revoke the token
      await revokeRefreshToken(refreshToken);
    }

    // Clear refresh token cookie
    cookieStore.delete('refreshToken');

    return NextResponse.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}
