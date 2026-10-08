<script lang="ts">
/**
 * Playground (AI Lab Playground.svelte): system prompt, conversation with
 * streamed answers, provider + model picker across every inference provider
 * (AI Lab, vLLM, MaaS with token quota, OpenShift AI port-forward).
 */
import { faCircleExclamation, faMessage, faPaperPlane, faRobot, faTerminal, faUser } from '@fortawesome/free-solid-svg-icons';
import { Button, DetailsPage, Dropdown, EmptyScreen, ProgressBar } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';
import { untrack } from 'svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import { navigate } from '#lib/nav.ts';

import { ai, providerModelLabel, providers, sendMessage, switchToLocal, toolHref } from '../../shared.ts';

interface Props {
  id: string;
  switchTo?: string;
}

let { id, switchTo = '' }: Props = $props();

const pg = $derived(ai().playgrounds.find(p => p.id === id));
const all = $derived(providers());
const provider = $derived(pg ? all.find(p => p.id === pg.providerId) : undefined);
let draft = $state('How do I reset my Acme account password?');
let scroller = $state<HTMLDivElement>();

$effect(() => {
  if (switchTo === 'local') {
    untrack(() => switchToLocal(id));
    navigate(toolHref('playground', { id }), true);
  }
});

$effect(() => {
  // keep the conversation scrolled to the bottom while streaming
  const last = pg?.messages[pg.messages.length - 1];
  void last?.content;
  if (scroller) scroller.scrollTop = scroller.scrollHeight;
});

function setProvider(v: string): void {
  if (!pg) return;
  pg.providerId = v;
  pg.model = all.find(p => p.id === v)?.models[0] ?? pg.model;
}

function setModel(v: string): void {
  if (pg) pg.model = v;
}

function send(): void {
  sendMessage(id, draft);
  draft = '';
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    send();
  }
}

function toLocal(): void {
  switchToLocal(id);
}

function close(): void {
  navigate(toolHref('playgrounds'));
}

function render(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>');
}
</script>

{#if pg}
  <DetailsPage title={pg.name} breadcrumbLeftPart="Playgrounds" breadcrumbRightPart={pg.name} onclose={close} onbreadcrumbClick={close}>
    {#snippet iconSnippet()}<Icon icon={faMessage} size="1.5x" />{/snippet}
    {#snippet subtitleSnippet()}
      <span class="text-sm text-[var(--pd-content-text)]">{provider ? `${provider.label} · ${provider.endpoint}` : 'Inference provider not running'}</span>
    {/snippet}
    {#snippet contentSnippet()}
      <div class="flex h-full min-h-0">
        <div class="flex flex-col grow min-w-0">
          <div bind:this={scroller} class="grow overflow-auto px-5 py-4 flex flex-col gap-3" role="log" aria-label="Conversation">
            <div class="rounded-md bg-[var(--pd-content-card-bg)] p-3 text-sm">
              <div class="flex items-center gap-2 text-xs font-semibold text-[var(--pd-content-card-header-text)] mb-1"><Icon icon={faTerminal} /> System prompt</div>
              <div class="text-[var(--pd-content-card-text)]">{pg.systemPrompt}</div>
            </div>
            {#each pg.messages as m (m.id)}
              {#if m.role === 'user'}
                <div class="self-end max-w-[75%] rounded-md bg-[var(--pd-content-card-selected-bg)] px-3 py-2 text-sm text-[var(--pd-content-card-header-text)]">
                  <div class="flex items-center gap-1.5 text-xs opacity-70 mb-0.5"><Icon icon={faUser} /> User</div>
                  {m.content}
                </div>
              {:else if m.role === 'assistant'}
                <div class="self-start max-w-[75%] rounded-md bg-[var(--pd-content-card-bg)] px-3 py-2 text-sm text-[var(--pd-content-card-text)]" aria-label="Assistant message">
                  <div class="flex items-center gap-1.5 text-xs opacity-70 mb-0.5"><Icon icon={faRobot} /> Assistant{m.provider ? ` · ${m.provider}` : ''}</div>
                  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                  <div>{@html render(m.content)}{#if m.streaming}<span class="animate-pulse">▍</span>{/if}</div>
                  {#if m.tokens}<div class="mt-1 text-xs opacity-60">{m.tokens} tokens · {(m.ms ?? 0) / 1000}s</div>{/if}
                </div>
              {:else if m.role === 'error'}
                <div class="self-start max-w-[75%] rounded-md border border-[var(--pd-state-error)] px-3 py-2 text-sm text-[var(--pd-state-error)] flex flex-col gap-2" role="alert">
                  <div class="flex gap-2"><Icon icon={faCircleExclamation} /> <span>{m.content}</span></div>
                  {#if m.content.startsWith('429')}<div><Button type="secondary" onclick={toLocal}>Switch to local AI Lab model</Button></div>{/if}
                </div>
              {:else}
                <div class="self-center text-xs text-[var(--pd-content-text)] opacity-80">{m.content}</div>
              {/if}
            {/each}
          </div>
          <div class="flex gap-2 px-5 py-3 border-t border-[var(--pd-content-divider)]">
            <textarea
              class="grow resize-none rounded-md bg-[var(--pd-input-field-bg)] border border-[var(--pd-input-field-stroke)] px-3 py-2 text-sm text-[var(--pd-input-field-focused-text)] outline-none focus:border-[var(--pd-input-field-hover-stroke)]"
              rows="2"
              aria-label="Prompt"
              placeholder="Type your prompt here"
              bind:value={draft}
              onkeydown={onKey}></textarea>
            <Button icon={faPaperPlane} onclick={send} disabled={!draft.trim()} aria-label="Send prompt" title="Send prompt" />
          </div>
        </div>
        <aside class="w-72 shrink-0 border-l border-[var(--pd-content-divider)] p-4 flex flex-col gap-4 overflow-auto bg-[var(--pd-content-bg)]" aria-label="Settings">
          <div class="text-sm font-semibold text-[var(--pd-content-header)]">Settings</div>
          <label class="text-xs text-[var(--pd-content-text)]">Inference provider
            <Dropdown class="mt-1" ariaLabel="Inference provider" value={pg.providerId} onChange={setProvider} options={all.map(p => ({ value: p.id, label: p.label }))} />
          </label>
          {#if provider}
            <div class="flex items-center gap-2 text-xs text-[var(--pd-content-text)] min-w-0"><AppIcon icon={provider.icon} size="16px" class="shrink-0" /><span class="shrink-0">{provider.kind}</span><span class="font-mono truncate" title={provider.endpoint}>{provider.endpoint}</span></div>
          {/if}
          <label class="text-xs text-[var(--pd-content-text)]">Model
            <Dropdown class="mt-1" ariaLabel="Model" value={pg.model} onChange={setModel} options={(provider?.models ?? [pg.model]).map(m => ({ value: m, label: providerModelLabel(provider, m) }))} />
          </label>
          {#if provider?.quota}
            {@const pct = Math.round((provider.quota.used / provider.quota.limit) * 100)}
            <div class="rounded-md bg-[var(--pd-content-card-bg)] p-3 text-xs text-[var(--pd-content-card-text)]" aria-label="Token quota">
              <div class="mb-1" class:text-[var(--pd-state-error)]={pct >= 100} class:text-[var(--pd-state-warning)]={pct >= 80 && pct < 100}>Token quota · {provider.quota.subscription}</div>
              <ProgressBar progress={pct} width="w-full" height="h-1.5" />
              <div class="mt-1">{provider.quota.used.toLocaleString('en-US')} / {provider.quota.limit.toLocaleString('en-US')} tokens per {provider.quota.window}</div>
            </div>
          {/if}
          <div class="text-xs text-[var(--pd-content-text)]">
            <div class="flex justify-between"><span>Temperature</span><span>0.8</span></div>
            <input type="range" min="0" max="2" step="0.1" value="0.8" class="w-full accent-[var(--pd-button-primary-bg)]" aria-label="Temperature" />
            <div class="flex justify-between mt-2"><span>Max tokens</span><span>1024</span></div>
            <input type="range" min="1" max="4096" value="1024" class="w-full accent-[var(--pd-button-primary-bg)]" aria-label="Max tokens" />
            <div class="flex justify-between mt-2"><span>Top-p</span><span>0.9</span></div>
            <input type="range" min="0" max="1" step="0.05" value="0.9" class="w-full accent-[var(--pd-button-primary-bg)]" aria-label="Top-p" />
          </div>
        </aside>
      </div>
    {/snippet}
  </DetailsPage>
{:else}
  <EmptyScreen icon={faMessage} title="Playground not found" message="This playground no longer exists." />
{/if}
