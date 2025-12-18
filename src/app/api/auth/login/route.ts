import { NextRequest, NextResponse } from 'next/server';
import { validateUser, createSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: '사용자명과 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    const user = await validateUser(username, password);

    if (!user) {
      return NextResponse.json(
        { error: '사용자명 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    const session = await createSession(user);

    const displayName = user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.username;

    return NextResponse.json({
      success: true,
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
    console.error('Login error:', error);
    return NextResponse.json(
      { error: '로그인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
