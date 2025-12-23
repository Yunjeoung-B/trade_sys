import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  // In a real app, you'd fetch additional user data from your database
  // For now, we'll return basic user info
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      username: user.email?.split('@')[0], // Extract username from email
      role: user.user_metadata?.role || 'client',
    },
  })
}
