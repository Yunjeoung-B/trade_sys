import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      );
    }

    const displayName = user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.username;

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        displayName,
        majorGroup: user.majorGroup,
        midGroup: user.midGroup,
        subGroup: user.subGroup,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: '사용자 정보 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
