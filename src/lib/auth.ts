import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

export async function validateUser(username: string, password: string) {
  const [user] = await db.select().from(users).where(eq(users.username, username));

  if (!user) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return null;
  }

  // Return user without password
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export async function getSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');

  if (!sessionCookie) {
    return null;
  }

  try {
    const session = JSON.parse(sessionCookie.value);
    return session;
  } catch {
    return null;
  }
}

export async function createSession(user: any) {
  const session = {
    userId: user.id,
    username: user.username,
    role: user.role,
    majorGroup: user.majorGroup,
    midGroup: user.midGroup,
    subGroup: user.subGroup,
  };

  const cookieStore = await cookies();
  cookieStore.set('session', JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/',
  });

  return session;
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}

export async function getCurrentUser() {
  const session = await getSession();

  if (!session) {
    return null;
  }

  const [user] = await db.select().from(users).where(eq(users.id, session.userId));

  if (!user) {
    return null;
  }

  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}
