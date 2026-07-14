import { Alert, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { data } from '@/lib/data';
import { useCurrentParentId } from '@/hooks/useCurrentParentId';
import type { FeedItem } from '@/types';
import { PhotoPostCard } from './PhotoPostCard';
import { QuestionPostCard } from './QuestionPostCard';

type PostCardProps = {
  item: FeedItem;
  /** Called after the post is deleted so the feed can refresh. */
  onDeleted?: () => void;
};

/**
 * Switches on post.type — photo vs question/text variants.
 * Long-pressing your own post offers to delete it.
 */
export function PostCard({ item, onDeleted }: PostCardProps) {
  const myId = useCurrentParentId();
  const isMine = myId === item.author.id;

  const confirmDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert('delete this post?', "it'll disappear from everyone's feed.", [
      { text: 'keep it', style: 'cancel' },
      {
        text: 'delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await data.deletePost(item.post.id);
            onDeleted?.();
          } catch (e) {
            Alert.alert('could not delete', e instanceof Error ? e.message : 'try again');
          }
        },
      },
    ]);
  };

  const card =
    item.post.type === 'photo' ? (
      <PhotoPostCard item={item} />
    ) : (
      <QuestionPostCard item={item} />
    );

  if (!isMine) return card;
  return <Pressable onLongPress={confirmDelete}>{card}</Pressable>;
}
