import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@server/prisma';
import { verifyAuth } from '@server/middleware/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const permissions = await prisma.permission.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    // Group by category
    const grouped = permissions.reduce((acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push(permission);
      return acc;
    }, {} as Record<string, typeof permissions>);

    return NextResponse.json({
      all: permissions,
      byCategory: grouped,
    });
  } catch (error) {
    console.error('Get permissions error:', error);
    return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 });
  }
}
