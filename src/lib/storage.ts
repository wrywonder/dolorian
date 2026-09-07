import { supabase } from './supabase';
import type { UUID } from '@/types';

export type PickedImage = {
  uri: string;
  /** Base64 payload from expo-image-picker (`base64: true`). */
  base64?: string | null;
};

function decodeImage(image: PickedImage): { body: ArrayBuffer; extension: 'png' | 'jpg'; contentType: string } {
  const extension = image.uri.split('.').pop()?.toLowerCase() === 'png' ? 'png' : 'jpg';
  const contentType = extension === 'png' ? 'image/png' : 'image/jpeg';
  if (!image.base64) throw new Error('The selected image did not include upload data. Please choose it again.');
  const binary = atob(image.base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return { body: bytes.buffer as ArrayBuffer, extension, contentType };
}

export async function uploadPostImage(parentId: UUID, image: PickedImage): Promise<string> {
  const decoded = decodeImage(image);
  const path = `${parentId}/${Date.now()}.${decoded.extension}`;

  // React Native's fetch(file://).blob() hands supabase-js a Blob it
  // can't serialize — the upload "succeeds" with a zero-byte object.
  // Upload raw bytes decoded from the picker's base64 instead.
  const { error } = await supabase.storage
    .from('post-images')
    .upload(path, decoded.body, { contentType: decoded.contentType });
  if (error) throw error;

  const { data } = supabase.storage.from('post-images').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadProfileImage(parentId: UUID, image: PickedImage): Promise<string> {
  const decoded = decodeImage(image);
  const path = `${parentId}/${Date.now()}.${decoded.extension}`;
  const { error } = await supabase.storage
    .from('profile-images')
    .upload(path, decoded.body, { contentType: decoded.contentType });
  if (error) throw error;
  const { data } = supabase.storage.from('profile-images').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadProfileBackground(parentId: UUID, image: PickedImage): Promise<string> {
  const decoded = decodeImage(image);
  const path = `${parentId}/covers/${Date.now()}.${decoded.extension}`;
  const { error } = await supabase.storage
    .from('profile-images')
    .upload(path, decoded.body, { contentType: decoded.contentType });
  if (error) throw error;
  const { data } = supabase.storage.from('profile-images').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadKidImage(
  parentId: UUID,
  kidKey: string,
  image: PickedImage,
): Promise<string> {
  const decoded = decodeImage(image);
  const safeKidKey = kidKey.replace(/[^a-zA-Z0-9-]/g, '-');
  const path = `${parentId}/kids/${safeKidKey}/${Date.now()}.${decoded.extension}`;
  const { error } = await supabase.storage
    .from('profile-images')
    .upload(path, decoded.body, { contentType: decoded.contentType });
  if (error) throw error;
  const { data } = supabase.storage.from('profile-images').getPublicUrl(path);
  return data.publicUrl;
}
