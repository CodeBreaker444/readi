import { supabase } from '@/backend/database/database';
import { existsSync, mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import { join } from 'path';


interface UserProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  timezone: string;
}

export async function updateUserProfile(
  userId: number,
  ownerId: number,
  profileData: UserProfileData,
  avatarFile?: File | null
) {
  try {
    let profilePicturePath: string | null = null;

    if (avatarFile) {
      const buffer = Buffer.from(await avatarFile.arrayBuffer());
      const extension = avatarFile.name.substring(avatarFile.name.lastIndexOf('.') + 1);
      
      const validTypes = ['gif', 'jpeg', 'jpg', 'png', 'GIF', 'JPEG', 'JPG', 'PNG'];
      if (!validTypes.includes(extension)) {
        throw new Error('Invalid file format. Please upload .gif, .jpeg, .jpg, or .png');
      }

      const uploadDir = join(process.cwd(), 'public', 'uploads', 'avatars', String(ownerId));
      if (!existsSync(uploadDir)) {
        mkdirSync(uploadDir, { recursive: true });
      }

      const filename = `${userId}_${Date.now()}.${extension}`;
      const filePath = join(uploadDir, filename);
      await writeFile(filePath, buffer);
      
      profilePicturePath = `/uploads/avatars/${ownerId}/${filename}`;
    }

    // Update users table
    const userUpdateData: any = {
      first_name: profileData.firstName,
      last_name: profileData.lastName,
      email: profileData.email,
      phone: profileData.phone,
      user_timezone: profileData.timezone,
      updated_at: new Date().toISOString()
    };

    const { data: userData, error: userError } = await supabase
      .from('users')
      .update(userUpdateData)
      .eq('user_id', userId)
      .eq('fk_owner_id', ownerId)
      .select()
      .single();

    if (userError) throw userError;

    // Update or insert users_profile
    if (profilePicturePath) {
      const { data: existingProfile } = await supabase
        .from('users_profile')
        .select('profile_id')
        .eq('fk_user_id', userId)
        .single();

      if (existingProfile) {
        // Update existing profile
        const { error: profileError } = await supabase
          .from('users_profile')
          .update({
            profile_picture: profilePicturePath,
            updated_at: new Date().toISOString()
          })
          .eq('fk_user_id', userId);

        if (profileError) throw profileError;
      } else {
        // Insert new profile
        const { error: profileError } = await supabase
          .from('users_profile')
          .insert({
            fk_user_id: userId,
            profile_picture: profilePicturePath
          });

        if (profileError) throw profileError;
      }
    }

    return {
      updateResult: true,
      param: {
        firstName: userData.first_name,
        lastName: userData.last_name,
        email: userData.email,
        phone: userData.phone,
        timezone: userData.user_timezone,
        profilePicture: profilePicturePath
      },
      message: 'Profile updated successfully'
    };
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw new Error('Failed to update user profile');
  }
}

export async function getUserProfile(userId: number, ownerId: number) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        users_profile (
          profile_picture,
          bio,
          address,
          city,
          state,
          postal_code,
          date_of_birth,
          emergency_contact,
          emergency_phone,
          certifications,
          skills,
          user_signature,
          user_primary_certification
        )
      `)
      .eq('user_id', userId)
      .eq('fk_owner_id', ownerId)
      .single();

    if (error) throw error;

    return {
      success: true,
      user: {
        ...data,
        fullName: `${data.first_name} ${data.last_name}`,
        profilePicture: data.users_profile?.profile_picture
      }
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw new Error('Failed to fetch user profile');
  }
}