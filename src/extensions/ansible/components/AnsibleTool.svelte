<script lang="ts">
/**
 * Tools › Ansible (P3): Projects / Runs / Execution environments / Rulebooks.
 * The tab lives in the URL (`?tab=runs&run=<artifact>`) so tasks, toasts and
 * other extensions (AAP "Run locally") can deep-link into it.
 */
import { faHammer, faPlay, faPlus } from '@fortawesome/free-solid-svg-icons';
import { Button, NavPage } from '@podman-desktop/ui-svelte';
import { page } from '$app/state';

import { openDialog } from '#lib/dialog.svelte.ts';
import { navigate, appUrl } from '#lib/nav.ts';

import EnvironmentsTab from './EnvironmentsTab.svelte';
import ProjectsTab from './ProjectsTab.svelte';
import RulebooksTab from './RulebooksTab.svelte';
import RunDialog from './RunDialog.svelte';
import RunsTab from './RunsTab.svelte';

const TABS = [
  { id: 'projects', label: 'Projects' },
  { id: 'runs', label: 'Runs' },
  { id: 'environments', label: 'Execution environments' },
  { id: 'rulebooks', label: 'Rulebooks' },
];

const tab = $derived(appUrl().searchParams.get('tab') ?? 'projects');
const runParam = $derived(appUrl().searchParams.get('run') ?? undefined);
const newParam = $derived(appUrl().searchParams.get('new') ?? undefined);

function setTab(id: string): void {
  navigate(`/tools/ansible?tab=${id}`);
}

function newProject(): void {
  navigate('/tools/ansible?tab=projects&new=playbook');
}

function newEe(): void {
  navigate('/tools/ansible?tab=environments&new=1');
}

function runPlaybook(): void {
  openDialog(RunDialog, { playbook: 'site.yml' });
}
</script>

<NavPage title="Ansible" searchEnabled={false}>
  {#snippet additionalActions()}
    {#if tab === 'projects'}
      <Button icon={faPlus} onclick={newProject}>New project</Button>
    {:else if tab === 'runs'}
      <Button icon={faPlay} onclick={runPlaybook}>Run playbook</Button>
    {:else if tab === 'environments'}
      <Button icon={faHammer} onclick={newEe}>New execution environment</Button>
    {/if}
  {/snippet}
  {#snippet tabs()}
    {#each TABS as t (t.id)}
      <Button type="tab" onclick={setTab.bind(undefined, t.id)} selected={tab === t.id}>{t.label}</Button>
    {/each}
  {/snippet}
  {#snippet content()}
    {#if tab === 'runs'}
      <RunsTab run={runParam} />
    {:else if tab === 'environments'}
      <EnvironmentsTab showForm={!!newParam} />
    {:else if tab === 'rulebooks'}
      <RulebooksTab />
    {:else}
      <ProjectsTab newType={newParam === 'collection' ? 'collection' : newParam ? 'playbook' : undefined} />
    {/if}
  {/snippet}
</NavPage>
