import { data } from '@/lib/data';
import type { ResolvedPrompt } from '@/types';
import { ShareAfterActivityCard } from './ShareAfterActivityCard';

type PromptCardProps = {
  resolved: ResolvedPrompt;
  /** Tapping "snap one" navigates to compose (Phase 8). */
  onCompose?: (prompt: ResolvedPrompt) => void;
  /** Called after the prompt state changes — parent re-fetches. */
  onChanged?: () => void;
};

/**
 * Generalized nudge card. Switches on prompt_type to render the right
 * variant. New types slot in here without touching screen code.
 *
 * For Phase 3 only `share_after_activity` is implemented; the other
 * three branches return null until their phases ship.
 */
export function PromptCard({ resolved, onCompose, onChanged }: PromptCardProps) {
  const { prompt } = resolved;

  switch (prompt.prompt_type) {
    case 'share_after_activity':
      return (
        <ShareAfterActivityCard
          prompt={prompt as ResolvedPrompt<'share_after_activity'>['prompt']}
          activity={resolved.activity ?? null}
          onSnap={async () => {
            onCompose?.(resolved);
            await data.markPromptActed(prompt.id);
            onChanged?.();
          }}
          onDismiss={async () => {
            await data.dismissPrompt(prompt.id);
            onChanged?.();
          }}
        />
      );

    case 'rsvp_from_friend_signal':
    case 'confirm_calendar_import':
    case 'finalize_weekend_story':
      // Implemented in Phases 9 + later. Surface nothing yet so the UI
      // never blocks on a half-built variant.
      return null;
  }
}
