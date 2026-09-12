import { useCallback, useEffect, useRef, useState } from 'react';
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
import { COMMENT_MAX_LENGTH, commentLength, prepareCommentBody } from '@/lib/post-engagement';
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const sendPending = useRef(false);
  const mounted = useRef(true);
  const draftLength = commentLength(draft);
  const tooLong = draftLength > COMMENT_MAX_LENGTH;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; requestVersion.current += 1; };
  }, []);

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoadError(null);
    try {
      const nextComments = await data.getPostComments(postId);
      if (version === requestVersion.current && mounted.current) setComments(nextComments);
    } catch (e) {
      console.warn('comments load failed', e);
      if (version === requestVersion.current && mounted.current) {
        setLoadError('Comments couldn’t load. Your draft is safe.');
      }
    }
  }, [postId]);

  useEffect(() => {
    if (open) {
      setComments(null);
      load();
    }
    return () => { requestVersion.current += 1; };
  }, [open, load]);

  const send = async () => {
    if (sendPending.current) return;
    let body: string;
    try { body = prepareCommentBody(draft); }
    catch (cause) {
      setSendError(cause instanceof Error ? cause.message : 'Check your comment and try again.');
      return;
    }
    sendPending.current = true;
    setSending(true);
    setSendError(null);
    try {
      await data.addComment(postId, body);
      if (!mounted.current) return;
      Haptics.selectionAsync().catch(() => {});
      setDraft('');
      onCommentAdded();
      await load();
    } catch (e) {
      console.warn('comment send failed', e);
      if (mounted.current) setSendError('Your comment didn’t send. Try again — your words are still here.');
    } finally {
      sendPending.current = false;
      if (mounted.current) setSending(false);
    }
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close comments"
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
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, marginBottom: 12 }}>
            <Text accessibilityRole="header" style={{ flex: 1, fontFamily: fonts.serif, fontSize: 24, color: colors.dark, letterSpacing: -0.4 }}>comments</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close comments" onPress={onClose} hitSlop={8} style={{ minHeight: 40, minWidth: 40, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="x" size={18} color={colors.brownMid} />
            </Pressable>
          </View>

          {loadError ? (
            <View style={{ paddingHorizontal: 22, gap: 8, marginBottom: 14 }}>
              <Text accessibilityRole="alert" style={{ fontFamily: fonts.sans, fontSize: 13, lineHeight: 19, color: colors.brownMid }}>{loadError}</Text>
              <Pressable accessibilityRole="button" onPress={load} style={{ minHeight: 40, justifyContent: 'center' }}><Text style={{ fontFamily: fonts.sansExtra, fontSize: 13, color: colors.terracotta }}>try again →</Text></Pressable>
            </View>
          ) : null}

          {comments === null && !loadError ? (
            <ActivityIndicator color={colors.terracotta} style={{ marginVertical: 28 }} />
          ) : comments?.length === 0 && !loadError ? (
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
          ) : comments && comments.length > 0 ? (
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
                    imageUrl={author?.avatar_url}
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
          ) : null}

          {sendError || tooLong ? (
            <Text accessibilityRole="alert" style={{ paddingHorizontal: 22, paddingTop: 10, fontFamily: fonts.sansSemi, fontSize: 12, lineHeight: 18, color: colors.terracotta }}>
              {tooLong ? `Keep your comment to ${COMMENT_MAX_LENGTH.toLocaleString('en-US')} characters or fewer.` : sendError}
            </Text>
          ) : null}

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
              onChangeText={(value) => { setDraft(value); setSendError(null); }}
              editable={!sending}
              accessibilityLabel="Add a comment"
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
              disabled={!draft.trim() || sending || tooLong}
              accessibilityRole="button"
              accessibilityLabel="Send comment"
              accessibilityState={{ disabled: !draft.trim() || sending || tooLong, busy: sending }}
              hitSlop={6}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: draft.trim() && !tooLong ? colors.terracotta : colors.rule,
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
          {draftLength >= COMMENT_MAX_LENGTH - 100 ? (
            <Text style={{ paddingHorizontal: 22, paddingTop: 4, fontFamily: fonts.mono, fontSize: 11, color: tooLong ? colors.terracotta : colors.taupe }}>{draftLength.toLocaleString('en-US')} / {COMMENT_MAX_LENGTH.toLocaleString('en-US')}</Text>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
