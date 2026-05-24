import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { UUID } from '@/types';

let _cached: UUID | null = null;

supabase.auth.onAuthStateChange(() => { _cached = null; });

export function useCurrentParentId(): UUID | null {
  const [id, setId] = useState<UUID | null>(_cached);

  useEffect(() => {
    if (_cached) { setId(_cached); return; }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from('parents')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            _cached = data.id;
            setId(data.id);
          }
        });
    });
  }, []);

  return id;
}
