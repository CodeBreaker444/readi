import { supabase } from '@/backend/database/database';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const validateSchema = z.object({
  id: z.string().min(1, 'Activation key is required'),
  email: z.string().email('Invalid email format'),
  username: z.string().min(1, 'Username is required'),
  o: z.string().optional(),  
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = validateSchema.safeParse(body);
    
    if (!validation.success) {
      console.error('Validation errors:', validation.error);
      return NextResponse.json(
        {
          code: 0,
          status: 'ERROR',
          message: 'Invalid request data',
          title: 'activateAccount',
        },
        { status: 400 }
      );
    }

    const { id: activationKey, email, username } = validation.data;


    const { data: user, error: findError } = await supabase
      .from('users')
      .select('user_id, user_active, auth_user_id, email, username, _key_, password_hash, first_name, last_name, user_role')
      .eq('_key_', activationKey)
      .eq('email', email)
      .eq('username', username)
      .maybeSingle();

    if (findError) {
      console.error('Database error:', findError);
      return NextResponse.json(
        {
          code: 0,
          status: 'ERROR',
          message: 'Database error occurred',
          title: 'activateAccount',
        },
        { status: 500 }
      );
    }

    if (!user) {
      console.error('User not found with provided credentials');
      return NextResponse.json(
        {
          code: 0,
          status: 'ERROR',
          message: 'Invalid or expired activation link',
          title: 'activateAccount',
        },
        { status: 404 }
      );
    }

    const isActive = user.user_active?.trim() === 'Y';

    if (isActive) {
      return NextResponse.json(
        {
          code: 0,
          status: 'ERROR',
          message: 'Account is already activated',
          title: 'activateAccount',
        },
        { status: 400 }
      );
    }

    let authUserId = user.auth_user_id;

    if (!authUserId) {
      console.log('Creating Supabase Auth user for:', email);
      
      try {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password_hash,
          email_confirm: true,
          user_metadata: {
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            username: user.username,
            role: user.user_role || '',
            activated_at: new Date().toISOString(),
          }
        });

        if (authError) {
          console.error('Auth user creation error:', authError);
          return NextResponse.json(
            {
              code: 0,
              status: 'ERROR',
              message: `Failed to create authentication account: ${authError.message}`,
              title: 'activateAccount',
            },
            { status: 500 }
          );
        }

        if (!authData.user) {
          console.error('No user data returned from auth creation');
          return NextResponse.json(
            {
              code: 0,
              status: 'ERROR',
              message: 'Failed to create authentication account',
              title: 'activateAccount',
            },
            { status: 500 }
          );
        }

        authUserId = authData.user.id;
        console.log('Auth user created successfully:', authUserId);

      } catch (authCreationError: any) {
        console.error('Exception during auth user creation:', authCreationError);
        return NextResponse.json(
          {
            code: 0,
            status: 'ERROR',
            message: `Authentication creation failed: ${authCreationError.message}`,
            title: 'activateAccount',
          },
          { status: 500 }
        );
      }
    } else {
      
      try {
        const { error: updateAuthError } = await supabase.auth.admin.updateUserById(authUserId, {
          email_confirm: true,
          user_metadata: {
            activated_at: new Date().toISOString(),
          }
        });

        if (updateAuthError) {
          console.error('Auth email confirmation error:', updateAuthError);
        } else {
          console.log('Auth user email confirmed successfully');
        }
      } catch (authError) {
        console.error('Exception during auth confirmation:', authError);
      }
    }

    const updateData: any = { 
      user_active: 'Y',
      updated_at: new Date().toISOString()
    };

    if (authUserId && !user.auth_user_id) {
      updateData.auth_user_id = authUserId;
    }

    console.log('Updating users table with:', updateData);

    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('user_id', user.user_id);

    if (updateError) {
      console.error('Activation update error:', updateError);
      
      if (authUserId && !user.auth_user_id) {
        console.log('Cleaning up auth user due to database update failure');
        try {
          await supabase.auth.admin.deleteUser(authUserId);
          console.log('Auth user cleaned up successfully');
        } catch (cleanupError) {
          console.error('Failed to cleanup auth user:', cleanupError);
        }
      }
      
      return NextResponse.json(
        {
          code: 0,
          status: 'ERROR',
          message: 'Failed to activate account in database',
          title: 'activateAccount',
        },
        { status: 500 }
      );
    }

    const { data: verifyUser, error: verifyError } = await supabase
      .from('users')
      .select('user_id, user_active, auth_user_id')
      .eq('user_id', user.user_id)
      .single();

    if (verifyError || !verifyUser || verifyUser.user_active?.trim() !== 'Y') {
      console.error('Update verification failed:', { verifyError, verifyUser });
      return NextResponse.json(
        {
          code: 0,
          status: 'ERROR',
          message: 'Failed to verify account activation',
          title: 'activateAccount',
        },
        { status: 500 }
      );
    }

    console.log('Account activated successfully:', {
      user_id: user.user_id,
      email: user.email,
      user_active: verifyUser.user_active,
      auth_user_id: verifyUser.auth_user_id
    });

    return NextResponse.json({
      code: 1,
      status: 'SUCCESS',
      message: 'Account activated successfully',
      title: 'activateAccount',
      timestamp: Math.floor(Date.now() / 1000),
      param: [
        {
          data: {
            username: username,
            email: email,
          },
        },
      ],
    });
  } catch (error: any) {
    console.error('Activation error:', error);
    return NextResponse.json(
      {
        code: 0,
        status: 'ERROR',
        message: `An error occurred during activation: ${error.message}`,
        title: 'activateAccount',
      },
      { status: 500 }
    );
  }
}