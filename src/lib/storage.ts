import { supabase } from './supabase';
import type { UUID } from '@/types';

export async function uploadPostImage(parentId: UUID, localUri: string): Promise<string> {
  const ext = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `${parentId}/${Date.now()}.${ext}`;

  const response = await fetch(localUri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from('post-images')
    .upload(path, blob, { contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}` });
  if (error) throw error;

  const { data } = supabase.storage.from('post-images').getPublicUrl(path);
  return data.publicUrl;
}
