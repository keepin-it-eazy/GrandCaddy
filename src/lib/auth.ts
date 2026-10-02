// src/lib/auth.ts
import { supabase } from './supabaseClient'

export type Role = 'customer' | 'helper'


async function ensureProfile(userId: string, fullName: string, role: Role) {
  // 1. profiles — insert only if missing, don't clobber full_name
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (!existingProfile) {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ id: userId, full_name: fullName })

    if (profileError) throw profileError
  }

  // 2. customer_profiles — only for customers, only if missing
  if (role === 'customer') {
    const { data: existingCustomer } = await supabase
      .from('customer_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (!existingCustomer) {
      const { error: customerProfileError } = await supabase
        .from('customer_profiles')
        .insert({ user_id: userId })

      if (customerProfileError) throw customerProfileError
    }
  }
}

export async function signUp(
  email: string,
  password: string,
  fullName: string,
  role: Role
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: role
      }
    }
  })

  if (error) throw error

  // Only run the fallback if we got a session (i.e. email confirmation off,
  // or already-confirmed user). If there's no session, the trigger still
  // created the rows when auth.users was inserted — no client write needed.
  if (data.user && data.session) {
    await ensureProfile(data.user.id, fullName, role)
  }

  return data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) throw error

  // Do NOT call ensureProfile on every login — the trigger handles new users,
  // and re-running it here overwrites any name changes made after signup.
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getCurrentProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) return null
  return data
}