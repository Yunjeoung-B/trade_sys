import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      redirect('/dashboard/customer/spot')
    } else {
      redirect('/login')
    }
  } catch (error) {
    // If Supabase initialization fails, redirect to login
    console.error('Error getting user:', error)
    redirect('/login')
  }
}
