import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatETB } from '@/types/inventory';

function showBrowserNotification(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible') return; // only when tab hidden
  try {
    new Notification(title, { body, icon: '/favicon.ico' });
  } catch {
    /* noop */
  }
}

export function useRealtimeNotifications() {
  const { isOwner, user } = useAuth();
  const mountedAt = useRef<number>(Date.now());

  useEffect(() => {
    if (!isOwner || !user) return;
    mountedAt.current = Date.now();

    // Ask browser permission once
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    const channel = supabase
      .channel('owner-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sales' },
        (payload) => {
          const row: any = payload.new;
          // Skip rows that arrived before subscription settled
          if (row?.created_at && new Date(row.created_at).getTime() < mountedAt.current - 5000) return;
          const title = 'New sale recorded';
          const body = `${row.total_units ?? 0} units · ${formatETB(Number(row.total_value ?? 0))}`;
          toast.success(title, { description: body });
          showBrowserNotification(title, body);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'stock_entries' },
        (payload) => {
          const row: any = payload.new;
          if (row?.created_at && new Date(row.created_at).getTime() < mountedAt.current - 5000) return;
          if (row.type !== 'inbound') return;
          const title = 'New stock added';
          const body = `${row.quantity} units received${row.reason ? ` · ${row.reason}` : ''}`;
          toast.success(title, { description: body });
          showBrowserNotification(title, body);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOwner, user]);
}
