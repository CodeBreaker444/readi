'use client';
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

interface SessionData {
  ownerId: number;
  isLoading: boolean;
  user: any;
}

export function useSession(): SessionData {
  const [sessionData, setSessionData] = useState<SessionData>({
    ownerId: 0,
    isLoading: true,
    user: null,
  });

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          setSessionData({ ownerId: 0, isLoading: false, user: null });
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('owner_id')
          .eq('id', user.id)
          .single();

        if (profileError || !profile) {
          setSessionData({ ownerId: 0, isLoading: false, user });
          return;
        }

        setSessionData({
          ownerId: profile.owner_id || 0,
          isLoading: false,
          user,
        });
      } catch (error) {
        console.error('Error getting session:', error);
        setSessionData({ ownerId: 0, isLoading: false, user: null });
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      getSession();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return sessionData;
}