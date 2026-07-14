# Dolorian builder–reviewer loop — setup

A Tier-1 (single-session) builder/reviewer loop for Claude Code. The plan file
is the engine; the agents are interchangeable workers against it.

## Install
1. Copy `ORCHESTRATION.md` to your repo root. Fill in the current phase + a few tasks.
2. Copy `.claude/agents/builder.md` and `.claude/agents/reviewer.md` into the repo.
3. Merge the `hooks` block from `.claude/settings.json` into your real settings.json.
4. `cp scripts/notify.sh $HOME/dolorian/scripts/ && chmod +x $HOME/dolorian/scripts/notify.sh`
   (adjust the path in settings.json + notify.sh if your repo lives elsewhere).
5. Test the channel: `scripts/notify.sh needs-you "test ping"` — you should get a notification.

## Drive one cycle
In Claude Code, from the repo:

> Read ORCHESTRATION.md. Use the builder subagent to complete the top unblocked
> task, then hand it to the reviewer subagent. Stop when the reviewer marks it
> done or when something lands in "Needs Drew."

That's one bounded cycle. Run it again to do the next task. Each cycle ends with
the plan file updated, so a fresh session always knows exactly where things stand
— that's your "pause before the token limit" handled by design, not by keeping a
process alive.

## How the human loop fires
- Builder/reviewer adds an item to **Needs Drew** → `Notification` hook → 🟠 ping.
- Session ends → `Stop` hook → 🔵 FYI (read the FYI log when convenient).
- Any task tries to close with failing lint/tests → `TaskCompleted` gate blocks it.

## Don't
- Don't let the reviewer write app code (it's tools-restricted for a reason).
- Don't run it greenfield expecting product taste — give it a skeleton + a sharp
  ORCHESTRATION.md first. The loop iterates well; it invents poorly.
- Don't jump to Agent Teams until the turn-based loop feels limiting. It costs
  far more tokens and is less crash-resilient.

## Upgrade path (only when you outgrow this)
Set `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` to run builder + reviewer in parallel
with live messaging + idle notifications + a shared task list. Higher token cost,
no teammate recovery on crash. Verify current behavior in the docs first.
