import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  hasRole: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    hasRole: false,
  });
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener BEFORE getting session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Check if user has a role - use setTimeout to avoid potential deadlock
          setTimeout(async () => {
            const { data: roles } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id);
            
            setAuthState({
              user: session.user,
              session,
              isLoading: false,
              hasRole: (roles && roles.length > 0) || false,
            });
          }, 0);
        } else {
          setAuthState({
            user: null,
            session: null,
            isLoading: false,
            hasRole: false,
          });
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id);
        
        setAuthState({
          user: session.user,
          session,
          isLoading: false,
          hasRole: (roles && roles.length > 0) || false,
        });
      } else {
        setAuthState({
          user: null,
          session: null,
          isLoading: false,
          hasRole: false,
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Check if user has a role
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', data.user.id);

    if (rolesError) throw rolesError;

    if (!roles || roles.length === 0) {
      await supabase.auth.signOut();
      throw new Error('Access denied. You do not have permission to access this system.');
    }

    toast({
      title: "Welcome back!",
      description: `Signed in as ${email}`,
    });

    return data;
  }, [toast]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed Out",
        description: "You have been signed out successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [toast]);

  return {
    ...authState,
    signIn,
    signOut,
  };
}
