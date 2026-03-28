import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Profile {
  id: string;
  name: string;
  email: string;
}

let cachedProfiles: Profile[] | null = null;

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>(cachedProfiles || []);

  useEffect(() => {
    if (cachedProfiles) return;
    supabase.from('profiles').select('id, name, email').eq('is_active', true).then(({ data }) => {
      if (data) {
        cachedProfiles = data;
        setProfiles(data);
      }
    });
  }, []);

  const getProfileName = (id: string) => {
    const p = profiles.find(p => p.id === id);
    return p?.name || '-';
  };

  return { profiles, getProfileName };
}