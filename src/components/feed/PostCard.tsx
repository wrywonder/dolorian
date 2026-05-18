import type { FeedItem } from '@/types';
import { PhotoPostCard } from './PhotoPostCard';
import { QuestionPostCard } from './QuestionPostCard';

type PostCardProps = {
  item: FeedItem;
};

/** Switches on post.type — photo vs question/text variants. */
export function PostCard({ item }: PostCardProps) {
  if (item.post.type === 'photo') return <PhotoPostCard item={item} />;
  return <QuestionPostCard item={item} />;
}
