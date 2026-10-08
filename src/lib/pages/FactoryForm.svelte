<script lang="ts">
/**
 * "Create …" wizard – ui-svelte FormPage like PD's
 * PreferencesConnectionCreationOrEditRendering. Runs the factory steps as a
 * task (P15); on completion the new connection appears in the primary nav.
 */
import { faCircleExclamation, faCircleInfo, faFolderOpen, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { Button, Checkbox, Dropdown, FormPage, Input, LinearProgress } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';
import { page } from '$app/state';

import AppIcon from '#lib/components/AppIcon.svelte';
import Contribution from '#lib/components/Contribution.svelte';
import { registry } from '#lib/ext/registry.svelte.ts';
import type { Contributed, FactoryDef, FactoryIssue, FormField, FormValues } from '#lib/ext/types.ts';
import { connectionHome, navigate } from '#lib/nav.ts';
import { addDynamicConnection, cancelTask, runTask, world } from '#lib/world.svelte.ts';

interface Props {
  factory: Contributed<FactoryDef>;
}

let { factory }: Props = $props();

let values = $state<FormValues>({});
let taskId = $state<string | undefined>();
const task = $derived(taskId ? world.tasks.find(t => t.id === taskId) : undefined);
const running = $derived(task?.status === 'in-progress');
const nameTaken = $derived(registry.connections.some(c => c.id === String(values.name ?? '')));

$effect.pre(() => {
  const init: FormValues = {};
  // `?<fieldId>=value` prefills the wizard (e.g. Image Builder → "Create machine from this compose")
  const params = page.url.searchParams;
  for (const f of factory.fields) {
    const fromUrl = params.get(f.id);
    if (fromUrl !== null) init[f.id] = f.type === 'checkbox' ? fromUrl === 'true' : f.type === 'number' || f.type === 'slider' ? Number(fromUrl) : fromUrl;
    else init[f.id] = f.default ?? (f.type === 'checkbox' ? false : '');
  }
  values = init;
  taskId = undefined;
});

const shownFields = $derived(factory.fields.filter(f => f.visible?.(values) ?? true));
const issues: FactoryIssue[] = $derived(task ? [] : (factory.validate?.(values) ?? []));
const blocking = $derived(issues.some(i => i.level === 'error'));
const ISSUE_ICON = { error: faCircleExclamation, warning: faTriangleExclamation, info: faCircleInfo };
const ISSUE_CLASS = { error: 'text-[var(--pd-state-error)]', warning: 'text-[var(--pd-state-warning)]', info: 'text-[var(--pd-state-info)]' };

function issuesFor(field: string | undefined): FactoryIssue[] {
  return issues.filter(i => i.field === field);
}

function applyFix(issue: FactoryIssue): void {
  if (issue.fix) values = { ...values, ...issue.fix.values };
}

function onInput(f: FormField, e: Event): void {
  const v = (e.currentTarget as HTMLInputElement).value;
  values[f.id] = f.type === 'number' || f.type === 'slider' ? Number(v) : v;
}

function onCheck(f: FormField, checked: boolean): void {
  values[f.id] = checked;
}

function onSelect(f: FormField, v: string): void {
  values[f.id] = v;
}

function browse(f: FormField): void {
  values[f.id] = f.id === 'image' ? 'C:\\Users\\dev\\Downloads\\rhel-9.6-x86_64-wsl.tar.gz' : '/home/user/file';
}

function create(): void {
  const snapshot = { ...values };
  const def = factory.createConnection(snapshot);
  taskId = runTask({
    name: `${factory.label}: ${def.name}`,
    ext: factory.ext.id,
    steps: factory.steps(snapshot),
    action: { label: `Open ${def.name}`, href: `/c/${def.id}` },
    onDone: () => {
      addDynamicConnection(factory.ext.id, def, def.initialStatus);
      factory.onCreated?.(world, def, snapshot);
    },
  });
}

function cancel(): void {
  if (taskId && running) cancelTask(taskId);
  navigate('/settings/resources');
}

function openResult(): void {
  const c = registry.getConnection(factory.createConnection(values).id);
  if (c) navigate(connectionHome(c));
}
</script>

<FormPage title={factory.label} inProgress={running} breadcrumbLeftPart="Resources" breadcrumbRightPart={factory.label} onclose={cancel} onbreadcrumbClick={cancel}>
  {#snippet icon()}<AppIcon icon={factory.ext.icon} size="40px" />{/snippet}
  {#snippet content()}
    <div class="px-5 pb-5 min-w-full max-w-[960px]">
      <Contribution ext={factory.ext} kind="connectionFactory" api="P12">
        <div class="bg-[var(--pd-content-card-bg)] py-6 px-8 rounded-lg space-y-5">
          {#if factory.description}<p class="text-[var(--pd-content-card-text)]">{factory.description}</p>{/if}
          {#snippet issueList(list: FactoryIssue[])}
            {#each list as issue, i (i)}
              <div class="flex items-start gap-2 rounded-md bg-[var(--pd-content-card-inset-bg)] px-3 py-2 text-sm" role={issue.level === 'error' ? 'alert' : 'status'} aria-label="{issue.level}: {issue.message}">
                <span class="mt-0.5 {ISSUE_CLASS[issue.level]}"><Icon icon={ISSUE_ICON[issue.level]} /></span>
                <div class="grow text-[var(--pd-content-card-text)]">
                  <div class="font-semibold {ISSUE_CLASS[issue.level]}">{issue.message}</div>
                  {#if issue.suggestion}<div>{issue.suggestion}</div>{/if}
                </div>
                {#if issue.fix}<Button type="secondary" onclick={applyFix.bind(undefined, issue)}>{issue.fix.label}</Button>{/if}
              </div>
            {/each}
          {/snippet}
          {@render issueList(issuesFor(undefined))}
          {#each shownFields as f (f.id)}
            <div class="flex flex-col gap-1.5">
              {#if f.type === 'checkbox'}
                <Checkbox checked={Boolean(values[f.id])} onclick={onCheck.bind(undefined, f)} disabled={!!task}>{f.label}</Checkbox>
              {:else}
                <label for="field-{f.id}" class="block text-base font-semibold text-[var(--pd-content-card-header-text)]">{f.label}</label>
                {#if f.type === 'select'}
                  <!-- re-keyed: ui-svelte Dropdown keeps its own value after a pick, so programmatic changes (fix, prefill) must remount it -->
                  {#key values[f.id]}
                    <Dropdown id="field-{f.id}" value={String(values[f.id] ?? '')} options={f.options ?? []} onChange={onSelect.bind(undefined, f)} disabled={!!task} />
                  {/key}
                {:else if f.type === 'slider'}
                  <div class="flex items-center gap-3">
                    <input id="field-{f.id}" type="range" min={f.min} max={f.max} value={Number(values[f.id])} oninput={onInput.bind(undefined, f)} disabled={!!task} class="grow accent-[var(--pd-button-primary-bg)]" />
                    <span class="w-24 text-right text-[var(--pd-content-card-text)] tabular-nums">{values[f.id]} {f.unit ?? ''}</span>
                  </div>
                {:else if f.type === 'file'}
                  <div class="flex gap-2">
                    <Input id="field-{f.id}" value={String(values[f.id] ?? '')} placeholder={f.placeholder} oninput={onInput.bind(undefined, f)} disabled={!!task} class="grow" />
                    <Button type="secondary" icon={faFolderOpen} onclick={browse.bind(undefined, f)} disabled={!!task}>Browse…</Button>
                  </div>
                {:else}
                  <Input id="field-{f.id}" type={f.type === 'number' ? 'number' : 'text'} value={String(values[f.id] ?? '')} placeholder={f.placeholder} oninput={onInput.bind(undefined, f)} disabled={!!task} error={f.id === 'name' && nameTaken && !task ? 'A connection with this name already exists' : undefined} />
                {/if}
              {/if}
              {#if f.description}<span class="text-sm text-[var(--pd-content-card-text)] opacity-80">{f.description}</span>{/if}
              {@render issueList(issuesFor(f.id))}
            </div>
          {/each}

          {#if task}
            <div class="rounded-md bg-[var(--pd-content-card-inset-bg)] p-3 space-y-2" aria-label="Creation progress">
              <div class="flex justify-between text-[var(--pd-content-card-text)]">
                <span>{task.status === 'in-progress' ? (task.step ?? 'Working') : task.status === 'success' ? 'Done' : (task.error ?? 'Canceled')}</span>
                <span class="tabular-nums">{task.progress}%</span>
              </div>
              {#if running}<LinearProgress />{/if}
              <pre class="max-h-32 overflow-auto text-xs font-mono text-[var(--pd-content-card-text)]">{task.logs.join('\n')}</pre>
            </div>
          {/if}

          <div class="flex justify-end gap-2 pt-2">
            <Button type="link" onclick={cancel}>{task?.status === 'success' ? 'Close' : 'Cancel'}</Button>
            {#if task?.status === 'success'}
              <Button onclick={openResult}>Open {values.name}</Button>
            {:else}
              <Button onclick={create} inProgress={running} disabled={running || blocking || (!!values.name && nameTaken)}>Create</Button>
            {/if}
          </div>
        </div>
      </Contribution>
    </div>
  {/snippet}
</FormPage>
