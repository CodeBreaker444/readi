import { supabase } from '@/backend/database/database'
import { verifyToken } from '@/lib/auth/jwt-utils'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import z from 'zod'
const validateSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 8 characters long')
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
      console.error('Validation errors:', validation.error)
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: validation.error
        },
        { status: 400 }
      )
    }
    const { newPassword } = validation.data

    if (!newPassword) {
      return NextResponse.json(
        { success: false, error: 'New password is required' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    const token = cookieStore.get('readi_auth_token')?.value
    console.log('Token found:', !!token)

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    console.log('Token payload:', payload)
    
    if (!payload || !payload.sub) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }


    const { data: userData, error: userFetchError } = await supabase
      .from('users')
      .select('user_id, auth_user_id, email')
      .eq('user_id', payload.sub)
      .single()

    console.log('User data:', userData)
    console.log('User fetch error:', userFetchError)

    if (userFetchError || !userData) {
      console.error('User fetch error:', userFetchError)
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    if (userData.auth_user_id) {
      
      try {
        const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
          userData.auth_user_id,
          { password: newPassword }
        )

        if (authUpdateError) {
          console.error('Auth password update error:', authUpdateError)
          return NextResponse.json(
            { success: false, error: `Failed to update authentication password: ${authUpdateError.message}` },
            { status: 500 }
          )
        }
        
      } catch (authError: any) {
        console.error('Exception updating auth password:', authError)
        return NextResponse.json(
          { success: false, error: `Failed to update authentication password: ${authError.message}` },
          { status: 500 }
        )
      }
    } else {
      console.warn('No auth_user_id found for user:', payload.sub)
    }

    
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: newPassword,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', payload.sub)

    if (updateError) {
      console.error('Password update error:', updateError)
      return NextResponse.json(
        { success: false, error: `Failed to update password in database: ${updateError.message}` },
        { status: 500 }
      )
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

    if (settingsError) {
      console.error('Settings update error:', settingsError)
    }


    return NextResponse.json({
      success: true,
      message: 'Password changed successfully'
    })
  } catch (error: any) {
    console.error('Error stack:', error.stack)
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to change password' },
      { status: 500 }
    )
  }
}