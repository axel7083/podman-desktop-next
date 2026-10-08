<script lang="ts">
/**
 * Scaffolder form for one template (`POST /api/scaffolder/v2/tasks`): parameters,
 * then the task steps fetch:template → publish:github → catalog:register (P15).
 * On success the new Component is registered in the catalog.
 */
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { Button, FormPage, Input } from '@podman-desktop/ui-svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import type { ConnectionView } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import { runTask, world } from '#lib/world.svelte.ts';

import Card from '../../_appdev/Card.svelte';
import TaskLog from '../../_appdev/TaskLog.svelte';
import { ensureHub, hub, RHDH_EXT, type SoftwareTemplate, type TemplateParam } from '../data.ts';

interface Props {
  conn: ConnectionView;
  template: SoftwareTemplate;
}

let { conn, template }: Props = $props();

let values = $state<Record<string, string>>({});
let repoEdited = $state(false);
let taskId = $state<string | undefined>();
let createdRef = $state<string | undefined>();

const task = $derived(taskId ? world.tasks.find(t => t.id === taskId) : undefined);
const running = $derived(task?.status === 'in-progress');
const name = $derived((values.name ?? '').trim());
const nameTaken = $derived(hub(conn.id).entities.some(e => e.kind === 'Component' && e.name === name));
const valid = $derived(/^[a-z0-9][a-z0-9-]*$/.test(name) && !nameTaken && (values.owner ?? '').trim() !== '');

$effect.pre(() => {
  const init: Record<string, string> = {};
  for (const p of template.parameters) init[p.id] = p.default;
  values = init;
});

function onInput(p: TemplateParam, e: Event): void {
  const v = (e.currentTarget as HTMLInputElement).value;
  values[p.id] = v;
  if (p.id === 'repoUrl') repoEdited = true;
  if (p.id === 'name' && !repoEdited) values.repoUrl = `github.com?owner=acme&repo=${v.trim()}`;
}

function repoSlug(): string {
  const url = new URLSearchParams((values.repoUrl ?? '').split('?')[1] ?? '');
  return `${url.get('owner') ?? 'acme'}/${url.get('repo') ?? name}`;
}

function create(): void {
  const snapshot = { name, owner: (values.owner ?? '').trim() };
  const slug = repoSlug();
  const scaffolderId = crypto.randomUUID();
  const ref = `component:${snapshot.name}`;
  taskId = runTask({
    name: `Create ${snapshot.name} from ${template.title}`,
    ext: RHDH_EXT,
    steps: [
      { label: 'fetch:template', ms: 1400, log: [`POST /api/scaffolder/v2/tasks → ${scaffolderId}`, `Fetching template content from ./skeleton (${template.name})`, `Rendered ${template.name === 'camel-integration' ? 9 : 23} files with values name=${snapshot.name}, owner=${snapshot.owner}`] },
      { label: 'publish:github', ms: 1800, log: [`Creating repository ${slug} (private: false, default branch: main)`, `Pushed initial commit to https://github.com/${slug}`] },
      { label: 'catalog:register', ms: 1100, log: [`Registering https://github.com/${slug}/blob/main/catalog-info.yaml`, `Registered ${ref} (owner ${snapshot.owner})`] },
    ],
    action: { label: 'Open in catalog', href: `/c/${conn.id}/catalog?entity=${encodeURIComponent(ref)}` },
    onDone: () => {
      const h = ensureHub(conn.id);
      if (!h.entities.some(e => e.kind === 'Component' && e.name === snapshot.name)) {
        h.entities.push({
          kind: 'Component',
          name: snapshot.name,
          namespace: 'default',
          description: `Created from the ${template.title} template`,
          type: template.type,
          lifecycle: 'experimental',
          owner: snapshot.owner,
          system: 'acme-commerce',
          annotations: { 'backstage.io/techdocs-ref': 'dir:.', 'github.com/project-slug': slug, 'backstage.io/source-template': `template:default/${template.name}` },
          links: [{ title: 'Repository', url: `https://github.com/${slug}` }],
          scaffolderTask: scaffolderId,
        });
      }
      createdRef = ref;
    },
  });
}

function close(): void {
  navigate(`/c/${conn.id}/templates`);
}

function openCatalog(): void {
  if (createdRef) navigate(`/c/${conn.id}/catalog?entity=${encodeURIComponent(createdRef)}`);
}
</script>

<FormPage title={template.title} inProgress={running} breadcrumbLeftPart="Templates" breadcrumbRightPart={template.title} onclose={close} onbreadcrumbClick={close}>
  {#snippet icon()}<AppIcon icon="icons/redhat.rhdh-local.png" size="40px" />{/snippet}
  {#snippet content()}
    <div class="px-5 pb-5 min-w-full">
      <div class="bg-[var(--pd-content-card-bg)] px-6 py-4 space-y-4 rounded-lg text-[var(--pd-content-card-text)]">
        <p class="text-sm">{template.description}</p>
        {#each template.parameters as p (p.id)}
          <div class="flex flex-col gap-1">
            <label class="font-semibold text-[var(--pd-content-card-header-text)]" for="tpl-{p.id}">{p.title}</label>
            <Input
              id="tpl-{p.id}"
              value={values[p.id] ?? ''}
              oninput={onInput.bind(undefined, p)}
              disabled={!!task}
              aria-label={p.title}
              error={p.id === 'name' && nameTaken && !task ? 'A component with this name already exists' : undefined} />
            {#if p.description}<span class="text-sm opacity-80">{p.description}</span>{/if}
          </div>
        {/each}
        <Card inset title="Steps">
          <ol class="list-decimal pl-5 text-sm space-y-0.5">
            {#each template.steps as s (s.id)}<li><code>{s.action}</code> · {s.name}</li>{/each}
          </ol>
        </Card>
        <TaskLog {taskId} label="Scaffolder task" />
        <div class="flex justify-end gap-2">
          {#if createdRef}
            <Button icon={faArrowRight} onclick={openCatalog}>Open in catalog</Button>
          {:else}
            <Button type="link" onclick={close} disabled={running}>Cancel</Button>
            <Button onclick={create} disabled={!valid || !!task} inProgress={running}>Create</Button>
          {/if}
        </div>
      </div>
    </div>
  {/snippet}
</FormPage>
