<script lang="ts">
/** Tools › RHEL Lightspeed: chat with the command-line assistant (streaming answers, conversation history). */
import { faPaperPlane, faPlus, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';
import { Button, EmptyScreen, NavPage } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';
import { page } from '$app/state';
import { onMount, tick } from 'svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import { registry } from '#lib/ext/registry.svelte.ts';
import { navigate } from '#lib/nav.ts';
import { later, toast, world } from '#lib/world.svelte.ts';

import { allRegistrations } from '../../rhel-registration/store.ts';
import { answer, type Conversation, CONVERSATIONS, RL_EXT } from '../data.ts';

function conversations(): Conversation[] {
  world.ext[RL_EXT] ??= { conversations: CONVERSATIONS };
  return (world.ext[RL_EXT] as { conversations: Conversation[] }).conversations;
}

let selected = $state<string>('conv-01');
let draft = $state('');
let streaming = $state<string | undefined>();
let scroller = $state<HTMLDivElement>();

const list = $derived(((world.ext[RL_EXT] as { conversations?: Conversation[] } | undefined)?.conversations ?? CONVERSATIONS));
const current = $derived(list.find(c => c.id === selected));
const registered = $derived(registry.activeConnections.filter(c => c.capabilities?.includes('rhel') && c.capabilities.includes('podman') && c.status === 'started' && allRegistrations()[c.id]?.status === 'Current'));
/** Prefer the machine already running the assistant container. */
const host = $derived(registered.find(c => world.containers.some(x => x.engineId === c.id && x.name === 'rhel-lightspeed-podman-desktop')) ?? registered[0]);

onMount(() => {
  conversations();
  const ask = page.url.searchParams.get('ask');
  if (ask) {
    newConversation(page.url.searchParams.get('source') === 'advisor' ? 'Advisor recommendation' : undefined);
    send(ask);
  }
});

function newConversation(context?: string): void {
  const conv: Conversation = { id: `conv-${Date.now()}`, title: 'New conversation', createdAt: new Date().toISOString(), context, messages: [] };
  const all = conversations();
  all.unshift(conv);
  selected = conv.id;
}

function startNew(): void {
  newConversation();
}

function select(id: string): void {
  selected = id;
}

function onInput(e: Event): void {
  draft = (e.currentTarget as HTMLTextAreaElement).value;
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    send(draft);
  }
}

function submit(): void {
  send(draft);
}

function scroll(): void {
  tick()
    .then(() => scroller?.scrollTo({ top: scroller.scrollHeight }))
    .catch(console.error);
}

function send(text: string): void {
  const q = text.trim();
  if (!q || streaming !== undefined) return;
  const conv = conversations().find(c => c.id === selected);
  if (!conv) return;
  draft = '';
  conv.messages.push({ role: 'user', text: q });
  if (conv.title === 'New conversation') conv.title = q.length > 48 ? `${q.slice(0, 48)}…` : q;
  const reply = answer(q);
  const words = reply.text.split(/(\s+)/);
  streaming = '';
  scroll();
  words.forEach((_, i) => {
    later(300 + i * 18, () => {
      streaming = words.slice(0, i + 1).join('');
      if (i === words.length - 1) {
        conv.messages.push(reply);
        streaming = undefined;
      }
      scroll();
    });
  });
}

function copy(text: string): void {
  const cmd = text.split('\n').filter(l => l.startsWith('    ')).map(l => l.trim()).join('\n');
  toast({ type: 'success', title: 'Copied to clipboard', body: cmd || text.slice(0, 80) });
}

function openMachine(): void {
  navigate('/settings/create/rhel-podman-machine');
}

function render(text: string): string[] {
  return text.split('\n');
}
</script>

<NavPage title="RHEL Lightspeed" searchEnabled={false}>
  {#snippet additionalActions()}
    <Button icon={faPlus} onclick={startNew}>New conversation</Button>
  {/snippet}
  {#snippet content()}
    {#if !host}
      <EmptyScreen icon={faWandMagicSparkles} title="Needs a RHEL-registered Podman machine" message="RHEL Lightspeed runs in a container on a registered RHEL machine and uses its entitlement certificate.">
        <Button onclick={openMachine}>Create RHEL Podman machine</Button>
      </EmptyScreen>
    {:else}
      <div class="flex w-full h-full min-h-0">
        <aside class="w-60 shrink-0 border-r border-[var(--pd-content-divider)] overflow-auto py-2" aria-label="Conversations">
          {#each list as c (c.id)}
            <button
              class="w-full text-left px-4 py-2 border-l-[3px] {c.id === selected ? 'border-[var(--pd-secondary-nav-selected-highlight)] bg-[var(--pd-secondary-nav-selected-bg)] text-[var(--pd-secondary-nav-text-selected)]' : 'border-transparent text-[var(--pd-secondary-nav-text)] hover:bg-[var(--pd-secondary-nav-text-hover-bg)]'}"
              onclick={select.bind(undefined, c.id)}>
              <div class="truncate">{c.title}</div>
              <div class="text-xs opacity-70 truncate">{c.context ?? new Date(c.createdAt).toLocaleString()}</div>
            </button>
          {/each}
        </aside>
        <section class="flex flex-col grow min-w-0" aria-label="Chat">
          <div class="px-5 py-2 text-sm text-[var(--pd-content-text)] border-b border-[var(--pd-content-divider)] flex items-center gap-2">
            <AppIcon icon="icons/redhat.rhel-lightspeed.png" size="16px" />
            Running in <span class="font-semibold">rhel-lightspeed-podman-desktop</span> on <span class="font-semibold">{host.name}</span>
          </div>
          <div bind:this={scroller} class="grow overflow-auto px-5 py-4 space-y-4" role="log" aria-label="Messages">
            {#each current?.messages ?? [] as m, i (i)}
              <div class="flex {m.role === 'user' ? 'justify-end' : ''}">
                <div class="max-w-[75%] rounded-lg px-4 py-3 {m.role === 'user' ? 'bg-[var(--pd-button-primary-bg)] text-[var(--pd-button-text)]' : 'bg-[var(--pd-content-card-bg)] text-[var(--pd-content-card-text)]'}">
                  {#each render(m.text) as line, j (j)}
                    {#if line.startsWith('    ')}
                      <pre class="font-mono text-xs bg-[var(--pd-terminal-background)] text-[var(--pd-terminal-foreground)] px-2 py-0.5">{line.trim()}</pre>
                    {:else}
                      <p class="min-h-2">{line}</p>
                    {/if}
                  {/each}
                  {#if m.role === 'assistant'}
                    {#each m.references ?? [] as r (r)}<div class="text-xs text-[var(--pd-link)] truncate">{r}</div>{/each}
                    <div class="flex items-center gap-3 mt-2 text-xs opacity-80">
                      <span class="grow">Always review AI-generated content prior to use.</span>
                      <Button type="link" onclick={copy.bind(undefined, m.text)}>Copy command</Button>
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
            {#if streaming !== undefined}
              <div class="max-w-[75%] rounded-lg px-4 py-3 bg-[var(--pd-content-card-bg)] text-[var(--pd-content-card-text)] whitespace-pre-wrap" aria-busy="true">{streaming}▍</div>
            {/if}
          </div>
          <div class="px-5 py-3 border-t border-[var(--pd-content-divider)] flex gap-2 items-end">
            <textarea
              class="grow resize-none rounded-md bg-[var(--pd-input-field-bg)] border border-[var(--pd-input-field-stroke)] text-[var(--pd-input-field-focused-text)] p-2 outline-none focus:border-[var(--pd-input-field-hover-stroke)]"
              rows="2"
              placeholder="Ask RHEL Lightspeed… (Enter to send)"
              aria-label="Ask RHEL Lightspeed"
              value={draft}
              oninput={onInput}
              onkeydown={onKey}></textarea>
            <Button icon={faPaperPlane} onclick={submit} disabled={!draft.trim() || streaming !== undefined}>Send</Button>
          </div>
        </section>
      </div>
    {/if}
  {/snippet}
</NavPage>
