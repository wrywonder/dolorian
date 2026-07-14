import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, fonts, type AvatarTone } from '@/lib/constants';
import { data } from '@/lib/data';
import { AvatarCircle, Icon } from '@/components/ui';
import { relativeShort } from '@/lib/format';
import type { CommentView, UUID } from '@/types';

type CommentsSheetProps = {
  open: boolean;
  postId: UUID;
  onClose: () => void;
  onCommentAdded: () => void;
};

/** Bottom sheet listing a post's comments with a composer row. */
export function CommentsSheet({ open, postId, onClose, onCommentAdded }: CommentsSheetProps) {
  const [comments, setComments] = useState<CommentView[] | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      setComments(await data.getPostComments(postId));
    } catch (e) {
      console.warn('comments load failed', e);
      setComments([]);
    }
  }, [postId]);

  useEffect(() => {
    if (open) {
      setComments(null);
      load();
    }
  }, [open, load]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await data.addComment(postId, body);
      Haptics.selectionAsync().catch(() => {});
      setDraft('');
      onCommentAdded();
      await load();
    } catch (e) {
      console.warn('comment send failed', e);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(45,36,27,0.35)' }}
          onPress={onClose}
        />
        <View
          style={{
            backgroundColor: colors.cream,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingTop: 20,
            paddingBottom: 34,
            maxHeight: '75%',
          }}
        >
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 24,
              color: colors.dark,
              letterSpacing: -0.4,
              paddingHorizontal: 22,
              marginBottom: 12,
            }}
          >
            comments
          </Text>

          {comments === null ? (
            <ActivityIndicator color={colors.terracotta} style={{ marginVertical: 28 }} />
          ) : comments.length === 0 ? (
            <Text
              style={{
                fontFamily: fonts.serif,
                fontSize: 15,
                color: colors.taupe,
                paddingHorizontal: 22,
                marginVertical: 20,
              }}
            >
              no comments yet — say something nice
            </Text>
          ) : (
            <ScrollView
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ paddingHorizontal: 22, gap: 14, paddingBottom: 8 }}
              keyboardShouldPersistTaps="handled"
            >
              {comments.map(({ comment, author }) => (
                <View key={comment.id} style={{ flexDirection: 'row', gap: 10 }}>
                  <AvatarCircle
                    initials={author?.avatar_initials ?? '?'}
                    tone={(author?.avatar_color ?? 'peach') as AvatarTone}
                    size={30}
                  />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                      <Text style={{ fontFamily: fonts.sansExtra, fontSize: 13, color: colors.dark }}>
                        {author?.display_name.split(' ')[0] ?? 'a parent'}
                      </Text>
                      <Text style={{ fontFamily: fonts.serif, fontSize: 12, color: colors.taupe }}>
                        {relativeShort(comment.created_at)}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontFamily: fonts.serif,
                        fontSize: 15.5,
                        color: colors.dark,
                        lineHeight: 21,
                        marginTop: 1,
                      }}
                    >
                      {comment.body}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {/* composer */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingHorizontal: 22,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: colors.rule,
              marginTop: 10,
            }}
          >
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="add a comment..."
              placeholderTextColor={colors.taupe}
              multiline
              style={{
                flex: 1,
                fontFamily: fonts.serif,
                fontSize: 16,
                color: colors.dark,
                maxHeight: 90,
                paddingVertical: 8,
              }}
            />
            <Pressable
              onPress={send}
              disabled={!draft.trim() || sending}
              hitSlop={6}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: draft.trim() ? colors.terracotta : colors.rule,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {sending ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Icon name="arrow.up" size={17} color={colors.white} weight={2.4} />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
