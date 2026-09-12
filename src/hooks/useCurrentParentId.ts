import { useEffect, useState } from 'react';
import { data } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import type { UUID } from '@/types';

/** Share the data layer's identity-safe cache; never keep a second account cache. */
export function useCurrentParentId(): UUID | null {
  const [id, setId] = useState<UUID | null>(() => data.getCachedCurrentParentId());

  useEffect(() => {
    let active = true;
    let request = 0;
    let authUserId: string | null | undefined;
    const load = () => {
      const current = ++request;
      void data.getCurrentParentId().then((parentId) => {
        if (active && current === request) setId(parentId);
      }).catch(() => {
        if (active && current === request) setId(null);
      });
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user.id ?? null;
      if (nextUserId === authUserId) return;
      authUserId = nextUserId;
      request += 1;
      if (!active) return;
      setId(null);
      if (nextUserId) load();
    });
    load();
    return () => {
      active = false;
      request += 1;
      subscription.unsubscribe();
    };
  }, []);

  return id;
}
