<script lang="ts">
/**
 * RHEL Lightspeed chat pane (bottom panel session of kind 'chat'): each
 * question quotes its context (log line, selection, failed command) in a
 * monospace block; answers stream word by word, cite RHEL docs and propose
 * a command ("Run in terminal" / "Copy"). Follow-up input at the bottom
 * (Enter sends) and the AI disclaimer.
 */
import { faCopy, faPaperPlane, faPlay } from '@fortawesome/free-solid-svg-icons';
import { tick, untrack } from 'svelte';

import type { PanelSession } from '../data.ts';
import { ensureChat, followUp, lightspeed, LS_ICON, type LsMessage, runSuggested, take } from '../r3/lightspeed.svelte.ts';
import LabIcon from './LabIcon.svelte';

interface Props {
  session: PanelSession;
}

let { session }: Props = $props();

let draft = $state('');
let scroller = $state<HTMLDivElement>();
let copied = $state<number | undefined>(undefined);

const messages = $derived<LsMessage[]>(lightspeed.chats[session.id] ?? []);
const busy = $derived(messages.some(m => m.role === 'assistant' && m.shown < m.total));

$effect(() => {
  const s = session;
  untrack(() => ensureChat(s));
});

// Keep the latest (streaming) answer in view.
$effect(() => {
  void messages.length;
  void messages.at(-1)?.shown;
  void tick().then(() => scroller && (scroller.scrollTop = scroller.scrollHeight));
});

function send(): void {
  const text = draft.trim();
  if (!text || busy) return;
  draft = '';
  followUp(session.id, text, messages.findLast(m => m.role === 'user')?.connId ?? session.connId);
}

function copy(m: LsMessage): void {
  if (!m.answer) return;
  void navigator.clipboard?.writeText(m.answer.cmd.join('\n'));
  copied = m.id;
  setTimeout(() => {
    if (copied === m.id) copied = undefined;
  }, 1500);
}

/** Words budget left for a part starting at `offset`. */
function budget(m: LsMessage, part: number): number {
  let used = 0;
  for (let i = 0; i < part; i++) used += m.answer!.parts[i].t.split(/\s+/).filter(Boolean).length;
  return m.shown - used;
}

function textWords(m: LsMessage): number {
  return m.answer!.parts.reduce((n, p) => n + p.t.split(/\s+/).filter(Boolean).length, 0);
}
</script>

<div data-testid="lightspeed-chat" class="flex flex-col flex-1 min-h-0 text-[13px] text-[var(--pd-content-header)]">
  <div bind:this={scroller} class="flex-1 min-h-0 overflow-auto px-4 py-3 flex flex-col gap-3">
    {#if !messages.length}
      <div class="m-auto flex flex-col items-center gap-2 text-[var(--pd-table-body-text)]">
        <LabIcon icon={LS_ICON} size={32} />
        <span>Ask RHEL Lightspeed about an error, a log line or a command.</span>
      </div>
    {/if}
    {#each messages as m (m.id)}
      {#if m.role === 'user'}
        <div data-testid="ls-msg" data-role="user" class="self-end max-w-[85%] flex flex-col gap-1.5 rounded-lg px-3 py-2 bg-[var(--pd-content-card-bg)]">
          {#if m.source}<span class="text-[11px] text-[var(--pd-table-body-text)]">From {m.source}</span>{/if}
          {#if m.context}<pre class="m-0 max-h-32 overflow-auto rounded border-l-2 border-[var(--pd-content-divider)] pl-2 py-1 font-mono text-[12px] leading-5 whitespace-pre-wrap break-all text-[var(--pd-table-body-text)]">{m.context}</pre>{/if}
          {#if m.text}<span>{m.text}</span>{/if}
        </div>
      {:else if m.answer}
        {@const a = m.answer}
        {@const tw = textWords(m)}
        <div data-testid="ls-msg" data-role="assistant" data-done={m.shown >= m.total} class="flex gap-2 max-w-[92%]">
          <LabIcon icon={LS_ICON} size={16} class="mt-0.5" />
          <div class="flex flex-col gap-2 min-w-0 leading-5">
            {#each a.parts as p, i (i)}
              {@const n = budget(m, i)}
              {#if n > 0}
                {#if p.quote}
                  <pre class="m-0 rounded px-2 py-1 font-mono text-[12px] whitespace-pre-wrap break-all bg-[var(--pd-code-block-bg)] text-[var(--pd-code-block-text)]">{take(p.t, n)}</pre>
                {:else}
                  <p class="m-0">{take(p.t, n)}</p>
                {/if}
              {/if}
            {/each}
            {#if m.shown > tw}
              <div class="rounded-md overflow-hidden border border-[var(--pd-content-divider)]">
                <pre class="m-0 px-3 py-2 font-mono text-[12px] leading-5 whitespace-pre-wrap break-all bg-[var(--pd-code-block-bg)] text-[var(--pd-code-block-text)]">{a.cmd.slice(0, m.shown - tw).join('\n')}</pre>
                {#if m.shown >= m.total}
                  <div class="flex items-center gap-1 px-2 h-8 bg-[var(--pd-content-card-bg)] text-[12px]">
                    <button type="button" data-testid="ls-run" class="act" onclick={(): void => runSuggested(a, m.connId)}><LabIcon icon={faPlay} size={14} />Run in terminal</button>
                    <button type="button" data-testid="ls-copy" class="act" onclick={(): void => copy(m)}><LabIcon icon={faCopy} size={14} />{copied === m.id ? 'Copied' : 'Copy'}</button>
                  </div>
                {/if}
              </div>
            {/if}
            {#if m.shown > tw + a.cmd.length}
              <div data-testid="ls-sources" class="flex flex-col gap-0.5 text-[12px]">
                <span class="text-[11px] text-[var(--pd-table-body-text)]">Sources</span>
                {#each a.sources.slice(0, m.shown - tw - a.cmd.length) as s (s.url)}
                  <a href={s.url} target="_blank" rel="noreferrer" class="truncate text-[var(--pd-table-body-text)] underline decoration-dotted hover:text-[var(--pd-link)]">{s.title}</a>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      {/if}
    {/each}
  </div>
  <div class="shrink-0 px-4 pt-2 pb-1.5 border-t border-[color-mix(in_srgb,var(--pd-content-divider)_60%,transparent)]">
    <div class="flex items-end gap-1 rounded-md border border-[var(--pd-input-field-stroke)] bg-[var(--pd-input-field-bg)] pl-2 pr-1 py-0.5 focus-within:border-[var(--pd-input-field-focused-stroke,var(--pd-tab-highlight))]">
      <textarea
        data-testid="ls-input"
        aria-label="Ask a follow-up"
        placeholder="Ask a follow-up…"
        rows="1"
        bind:value={draft}
        class="flex-1 min-h-7 max-h-24 py-1 resize-none bg-transparent outline-none text-[12px] leading-5 text-[var(--pd-input-field-focused-text)] placeholder:text-[var(--pd-input-field-placeholder-text)]"
        onkeydown={(e): void => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}></textarea>
      <button type="button" data-testid="ls-send" aria-label="Send" title="Send (Enter)" class="act mb-0.5" disabled={!draft.trim() || busy} onclick={send}><LabIcon icon={faPaperPlane} size={14} /></button>
    </div>
    <p class="m-0 mt-1 text-[11px] text-[var(--pd-table-body-text)]">Answers are generated by AI and may be inaccurate. Review before running.</p>
  </div>
</div>

<style>
.act {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 6px;
  border-radius: 4px;
  color: var(--pd-action-button-details-text);
}
.act:hover:not(:disabled) {
  background: var(--pd-action-button-details-bg);
  color: var(--pd-action-button-details-hover-text);
}
.act:disabled {
  opacity: 0.4;
}
</style>
