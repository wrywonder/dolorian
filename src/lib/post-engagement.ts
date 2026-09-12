/** Matches post_comments.body's database limit (Postgres counts code points). */
export const COMMENT_MAX_LENGTH = 1_000;

export function commentLength(body: string): number {
  return [...body.trim()].length;
}

export function prepareCommentBody(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) throw new Error('Write a comment first.');
  if (commentLength(trimmed) > COMMENT_MAX_LENGTH) {
    throw new Error(`Keep your comment to ${COMMENT_MAX_LENGTH.toLocaleString('en-US')} characters or fewer.`);
  }
  return trimmed;
}

/** Preserve everyone else's reactions when applying this parent's new state. */
export function reactionCountAfter(count: number, wasReacted: boolean, isReacted: boolean): number {
  return Math.max(0, count + Number(isReacted) - Number(wasReacted));
}

/** A readable, expandable preview that never splits an emoji in half. */
export function captionPreview(body: string): { text: string; truncated: boolean } {
  const trimmed = body.trim();
  const firstLines = trimmed.split('\n').slice(0, 3).join('\n');
  const text = [...firstLines].slice(0, 180).join('').trimEnd();
  const truncated = text !== trimmed;
  return { text: truncated ? `${text}…` : text, truncated };
}
