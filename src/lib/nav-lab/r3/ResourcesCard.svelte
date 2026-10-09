<script lang="ts">
/**
 * "Resources" card (rule E19) at the bottom of an extension page: docs,
 * source repository and product page of the extension, each as a 14px icon +
 * label + host, opening in a new tab. Accent color on hover only (rule C9).
 * Renders nothing when the id has no known links.
 */
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { faArrowUpRightFromSquare, faBook, faGlobe } from '@fortawesome/free-solid-svg-icons';

import LabIcon from '../ui/LabIcon.svelte';
import Card from './Card.svelte';
import { hostOf, linksFor } from './ext-links.ts';

interface Props {
  id: string;
}

let { id }: Props = $props();

const links = $derived(linksFor(id));
const ICONS = { Docs: faBook, Repository: faGithub, Product: faGlobe } as const;
const LABELS = { Docs: 'Documentation', Repository: 'Source repository', Product: 'Product page' } as const;
</script>

{#if links.length}
  <Card title="Resources" testid="resources-card">
    <ul class="flex flex-col gap-1">
      {#each links as l (l.href)}
        {@const k = l.label as keyof typeof ICONS}
        <li>
          <a
            href={l.href}
            target="_blank"
            rel="noreferrer"
            data-testid="resource-link"
            class="group flex items-center gap-2 h-7 text-[13px] text-[var(--pd-content-header)] hover:text-[var(--pd-link)]">
            <span class="flex shrink-0 text-[var(--pd-table-body-text)] group-hover:text-[var(--pd-link)]"><LabIcon icon={ICONS[k] ?? faGlobe} size={14} /></span>
            <span class="shrink-0">{LABELS[k] ?? l.label}</span>
            <span class="truncate min-w-0 text-[12px] text-[var(--pd-table-body-text)]">{hostOf(l.href)}</span>
            <span class="flex opacity-0 group-hover:opacity-100 text-[var(--pd-link)]"><LabIcon icon={faArrowUpRightFromSquare} size={14} /></span>
          </a>
        </li>
      {/each}
    </ul>
  </Card>
{/if}
