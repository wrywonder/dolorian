type PostKind = 'photo' | 'question' | 'text';

/** Only attach media that the composer currently shows to the parent. */
export function preparePostDraft<Image>(kind: PostKind, body: string, image: Image | null) {
  const text = body.trim();
  const visibleImage = kind === 'photo' ? image : null;
  if (!text && !visibleImage) {
    throw new Error(kind === 'photo' ? 'Add a photo or a few words first.' : 'Write a few words first.');
  }
  return { type: kind, body: text || null, image: visibleImage };
}
