<script lang="ts">
/**
 * Lightspeed chat (P3 tool) scoped to one cluster. "Ask Lightspeed" opens it
 * with `?conn=&about=Kind~ns~name`: the object YAML and its logs are attached
 * (OLS `attachments`) and the question is pre-filled.
 */
import { faCommentDots, faPaperclip, faPaperPlane, faWrench } from '@fortawesome/free-solid-svg-icons';
import { Button, Dropdown, EmptyScreen, Input, NavPage } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';
import { page } from '$app/state';

import { registry } from '#lib/ext/registry.svelte.ts';
import { navigate } from '#lib/nav.ts';
import { cleanKube, toYaml } from '#lib/resources/kube.ts';
import { later, runTask, toast, world } from '#lib/world.svelte.ts';

import { LEDGER_WORKER_LOGS } from '../../ocm/data.ts';
import { type Attachment, conversation, CRASH_ANSWER, CRASH_DOCS, GENERIC_ANSWER, hasOls, OLS_CONFIG, OLS_ID, type Turn } from '../data.ts';

const clusters = $derived(registry.activeConnections.filter(c => c.kind === 'kubernetes' && c.status === 'started' && c.capabilities?.includes('openshift')));
let selected = $state(page.url.searchParams.get('conn') ?? 'ocp-dev');
const conn = $derived(registry.getConnection(selected));
const installed = $derived(conn?.status === 'started' && hasOls(selected));
const turns = conversation();

let query = $state('');
let attachments = $state<Attachment[]>([]);

$effect.pre(() => {
  const about = page.url.searchParams.get('about');
  if (!about) return;
  const [kind, ns, name] = decodeURIComponent(about).split('~');
  const obj = (world.kube[selected] ?? []).find(o => o.kind === kind && (o.metadata.namespace ?? '_') === ns && o.metadata.name === name);
  if (!obj) return;
  const crash = obj.status?.phase === 'CrashLoopBackOff';
  query = crash ? `Why is ${name} in CrashLoopBackOff?` : `Explain the status of ${kind} ${name}.`;
  attachments = [
    { attachment_type: 'api object', content_type: 'application/yaml', label: `${kind} ${name} (YAML)`, content: toYaml(cleanKube(obj)) },
    ...(kind === 'Pod' ? [{ attachment_type: 'log' as const, content_type: 'text/plain' as const, label: `${name} logs (last 200 lines)`, content: (crash ? LEDGER_WORKER_LOGS : ['ok']).join('\n') }] : []),
  ];
});

function onQuery(e: Event): void {
  query = (e.currentTarget as HTMLInputElement).value;
}

function onCluster(v: string): void {
  selected = v;
}

function removeAttachment(a: Attachment): void {
  attachments = attachments.filter(x => x !== a);
}

function send(): void {
  if (!query.trim()) return;
  const crash = attachments.some(a => a.content.includes('password authentication failed'));
  turns.push({ role: 'user', text: query, attachments: [...attachments] });
  const answer: Turn = { role: 'assistant', text: '', streaming: true, referenced_documents: [], tokens: { input: crash ? 2214 : 412, output: crash ? 186 : 64 } };
  turns.push(answer);
  const full = crash ? CRASH_ANSWER : GENERIC_ANSWER;
  const index = turns.length - 1;
  const words = full.split(/(\s+)/);
  words.forEach((_, i) =>
    later(30 * i, () => {
      const t = turns[index];
      t.text = words.slice(0, i + 1).join('');
      if (i === words.length - 1) {
        t.streaming = false;
        t.referenced_documents = crash ? CRASH_DOCS : [];
        if (crash) t.fix = { label: 'Update Secret ledger-db and restart ledger-worker' };
      }
    }),
  );
  query = '';
  attachments = [];
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Enter') send();
}

function applyFix(t: Turn): void {
  if (!t.fix) return;
  t.fix.done = true;
  runTask({
    name: 'Fix ledger-worker on ocp-dev',
    ext: OLS_ID,
    steps: [
      { label: 'oc -n ledger apply secret/ledger-db', ms: 700, log: ['secret/ledger-db configured'] },
      { label: 'oc -n ledger rollout restart deployment/ledger-worker', ms: 900, log: ['deployment.apps/ledger-worker restarted'] },
      { label: 'Waiting for ledger-worker to be ready', ms: 1600, log: ['deployment "ledger-worker" successfully rolled out'] },
    ],
    action: { label: 'Open pods', href: '/c/ocp-dev/k8s-pods' },
    onDone: () => {
      for (const o of world.kube['ocp-dev'] ?? []) {
        if (o.kind === 'Pod' && o.metadata.name.startsWith('ledger-worker')) {
          o.metadata.name = 'ledger-worker-7c4d9b6f5-m8k2w';
          o.metadata.creationTimestamp = new Date().toISOString();
          o.status = { phase: 'Running', ready: '1/1', restarts: 0 };
        }
        if (o.kind === 'Deployment' && o.metadata.name === 'ledger-worker') o.status = { readyReplicas: 1 };
      }
    },
  });
}

function openDoc(url: string): void {
  toast({ type: 'info', title: `Opening ${url}` });
}

function operators(): void {
  navigate(`/c/${selected}/operators`);
}

function clear(): void {
  turns.length = 0;
}
</script>

<NavPage title="Lightspeed" searchEnabled={false}>
  {#snippet additionalActions()}
    <div class="flex items-center gap-2">
      <span class="text-sm text-[var(--pd-content-text)]">Cluster</span>
      <div class="w-44"><Dropdown ariaLabel="Cluster" value={selected} onChange={onCluster} options={clusters.map(c => ({ value: c.id, label: c.name }))} /></div>
      <Button type="secondary" disabled={turns.length === 0} onclick={clear}>New conversation</Button>
    </div>
  {/snippet}
  {#snippet content()}
    <div class="flex flex-col w-full h-full min-h-0">
      {#if !conn || conn.status !== 'started'}
        <EmptyScreen icon={faCommentDots} title="{selected} is not connected" message="Connect to the cluster to ask OpenShift Lightspeed about it." />
      {:else if !installed}
        <EmptyScreen icon={faCommentDots} title="OpenShift Lightspeed is not installed on {conn.name}" message="Install the OpenShift Lightspeed operator (lightspeed-operator) and configure an OLSConfig to chat about this cluster.">
          <Button onclick={operators}>Install from Operators</Button>
        </EmptyScreen>
      {:else}
        <div class="grow overflow-auto px-5 py-3 space-y-3" role="log" aria-label="Conversation">
          <div class="text-sm text-[var(--pd-content-text)] flex items-center gap-2">
            <span class="rounded-sm px-2 py-0.5 bg-[var(--pd-label-bg)] text-[var(--pd-label-text)]">{conn.name} / {OLS_CONFIG.defaultModel}</span>
            Answers use your cluster token (jdoe) and the {OLS_CONFIG.defaultProvider} provider configured in OLSConfig cluster.
          </div>
          {#if turns.length === 0}
            <EmptyScreen icon={faCommentDots} title="Ask about {conn.name}" message="Use “Ask Lightspeed” on a pod, PipelineRun or VM to attach its YAML and logs." />
          {/if}
          {#each turns as t, i (i)}
            <div class="flex {t.role === 'user' ? 'justify-end' : 'justify-start'}">
              <div class="max-w-[75%] rounded-lg p-3 {t.role === 'user' ? 'bg-[var(--pd-button-primary-bg)] text-[var(--pd-button-text)]' : 'bg-[var(--pd-content-card-bg)] text-[var(--pd-content-card-text)]'}">
                <div class="whitespace-pre-wrap text-base">{t.text}{#if t.streaming}<span class="animate-pulse">▌</span>{/if}</div>
                {#if t.attachments?.length}
                  <div class="flex flex-wrap gap-1 mt-2">
                    {#each t.attachments as a (a.label)}<span class="text-xs rounded-sm px-1.5 py-0.5 bg-[var(--pd-content-card-inset-bg)] text-[var(--pd-content-card-text)] flex items-center gap-1"><Icon icon={faPaperclip} />{a.label}</span>{/each}
                  </div>
                {/if}
                {#if t.referenced_documents?.length}
                  <div class="mt-2 text-sm flex flex-col">
                    <span class="text-[var(--pd-content-card-title)]">References</span>
                    {#each t.referenced_documents as d (d.doc_url)}<button class="text-left text-[var(--pd-link)] hover:underline" onclick={openDoc.bind(undefined, d.doc_url)}>{d.doc_title}</button>{/each}
                  </div>
                {/if}
                {#if t.fix}
                  <div class="mt-3"><Button icon={faWrench} disabled={t.fix.done} onclick={applyFix.bind(undefined, t)}>{t.fix.done ? 'Fix applied' : t.fix.label}</Button></div>
                {/if}
                {#if t.tokens && !t.streaming}<div class="mt-1 text-xs text-[var(--pd-content-card-title)]">{t.tokens.input} input · {t.tokens.output} output tokens</div>{/if}
              </div>
            </div>
          {/each}
        </div>
        <div class="px-5 py-3 border-t border-[var(--pd-content-divider)] flex flex-col gap-2">
          {#if attachments.length}
            <div class="flex flex-wrap gap-1" aria-label="Attachments">
              {#each attachments as a (a.label)}
                <button class="text-xs rounded-sm px-1.5 py-0.5 bg-[var(--pd-label-bg)] text-[var(--pd-label-text)] flex items-center gap-1" title="Remove attachment" onclick={removeAttachment.bind(undefined, a)}><Icon icon={faPaperclip} />{a.label} ✕</button>
              {/each}
            </div>
          {/if}
          <div class="flex gap-2">
            <div class="grow"><Input value={query} oninput={onQuery} onkeypress={onKey} placeholder="Ask about {conn.name}…" aria-label="Lightspeed question" /></div>
            <Button icon={faPaperPlane} disabled={!query.trim()} onclick={send}>Send</Button>
          </div>
          <span class="text-xs text-[var(--pd-content-text)] opacity-70">Always review AI-generated content before using it.</span>
        </div>
      {/if}
    </div>
  {/snippet}
</NavPage>
