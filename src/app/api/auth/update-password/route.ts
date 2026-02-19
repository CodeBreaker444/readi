import { supabase } from '@/backend/database/database'
import { verifyToken } from '@/lib/auth/jwt-utils'
import bcrypt from 'bcrypt'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import z from 'zod'

const validateSchema = z.object({
  newPassword: z.string()
    .min(6, 'Password must be at least 6 characters long')  
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),    
})      

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = validateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors
        },
        { status: 400 }
      )
    }

    const { newPassword } = validation.data

    const cookieStore = await cookies()
    const token = cookieStore.get('readi_auth_token')?.value

    if (!token) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const payload = verifyToken(token)
    
    if (!payload || !payload.sub) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })
    }

    const { data: userData, error: userFetchError } = await supabase
      .from('users')
      .select('user_id, auth_user_id, email')
      .eq('user_id', payload.sub)
      .single()

    if (userFetchError || !userData) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    if (userData.auth_user_id) {
      const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
        userData.auth_user_id,
        { password: newPassword }
      )

      if (authUpdateError) {
        return NextResponse.json(
          { success: false, error: `Auth service error: ${authUpdateError.message}` },
          { status: 500 }
        )
      }
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: hashedNewPassword,  
        updated_at: new Date().toISOString()
      })
      .eq('user_id', payload.sub)

    if (updateError) {
      return NextResponse.json({ success: false, error: 'Failed to update database' }, { status: 500 })
    }

    const { error: settingsError } = await supabase
      .from('user_settings')
      .upsert({
        fk_user_id: payload.sub,
        setting_key: 'password_changed',
        setting_value: 'true',
        setting_type: 'boolean',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'fk_user_id,setting_key'
      })

    if (settingsError) console.error('Settings sync error:', settingsError)

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully'
    })

  } catch (error: any) {
    console.error('Change password error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}