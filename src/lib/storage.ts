import { supabase } from './supabase';
import type { UUID } from '@/types';

export type PickedImage = {
  uri: string;
  /** Base64 payload from expo-image-picker (`base64: true`). */
  base64?: string | null;
};

export async function uploadPostImage(parentId: UUID, image: PickedImage): Promise<string> {
  const ext = image.uri.split('.').pop()?.toLowerCase() === 'png' ? 'png' : 'jpg';
  const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
  const path = `${parentId}/${Date.now()}.${ext}`;

  // React Native's fetch(file://).blob() hands supabase-js a Blob it
  // can't serialize — the upload "succeeds" with a zero-byte object.
  // Upload raw bytes decoded from the picker's base64 instead.
  let body: ArrayBuffer;
  if (image.base64) {
    const bin = atob(image.base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    body = bytes.buffer as ArrayBuffer;
  } else {
    body = await (await fetch(image.uri)).arrayBuffer();
  }

  const { error } = await supabase.storage
    .from('post-images')
    .upload(path, body, { contentType });
  if (error) throw error;

  const { data } = supabase.storage.from('post-images').getPublicUrl(path);
  return data.publicUrl;
}
