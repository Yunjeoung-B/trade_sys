import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { db } from '@/server/db'
import { currencyPairs } from '@shared/schema'

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Fetch currency pairs from database using Drizzle
    const pairs = await db.select().from(currencyPairs)

    return NextResponse.json(pairs)
  } catch (error) {
    console.error('Error fetching currency pairs:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
