import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

    // Return hardcoded currency pairs for now
    // TODO: Migrate to Supabase database
    const pairs = [
      { code: 'USD/KRW', name: 'US Dollar / Korean Won' },
      { code: 'EUR/KRW', name: 'Euro / Korean Won' },
      { code: 'JPY/KRW', name: 'Japanese Yen / Korean Won' },
      { code: 'GBP/KRW', name: 'British Pound / Korean Won' },
      { code: 'CNY/KRW', name: 'Chinese Yuan / Korean Won' },
    ]

    return NextResponse.json(pairs)
  } catch (error) {
    console.error('Error fetching currency pairs:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
