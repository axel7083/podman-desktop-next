<script lang="ts">
/** Launch a job template (POST /api/controller/v2/job_templates/{id}/launch/ {limit, extra_vars}). */
import { faRocket } from '@fortawesome/free-solid-svg-icons';
import { Button, Input } from '@podman-desktop/ui-svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import { navigate } from '#lib/nav.ts';

import { CONN_ID, launchTemplate, store } from '../data.ts';
import PdModal from './PdModal.svelte';

interface Props {
  templateId: number;
  onclose: () => void;
}

let { templateId, onclose }: Props = $props();

const { templates } = store();
const tpl = $derived(templates.find(t => t.id === templateId));

// svelte-ignore state_referenced_locally
let limit = $state(templateId === 12 ? 'web*' : '');
// svelte-ignore state_referenced_locally
let extraVars = $state(templateId === 12 ? 'orders_api_tag: "2.3"\nquadlet_dir: ~/.config/containers/systemd' : '');

function onLimit(e: Event): void {
  limit = (e.currentTarget as HTMLInputElement).value;
}

function onVars(e: Event): void {
  extraVars = (e.currentTarget as HTMLTextAreaElement).value;
}

function launch(): void {
  if (!tpl) return;
  const id = launchTemplate(tpl, limit.trim(), extraVars.trim());
  onclose();
  navigate(`/c/${CONN_ID}/aap-jobs?job=${id}`);
}
</script>

<PdModal title="Launch {tpl?.name ?? 'job template'}" {onclose}>
  {#snippet icon()}<AppIcon icon="icons/redhat.aap.png" size="20px" />{/snippet}
  {#snippet content()}
    {#if tpl}
      <div class="flex flex-col gap-3">
        <div class="text-sm opacity-80">
          {tpl.job_type === 'check' ? 'Check' : 'Run'} · {tpl.playbook} · inventory {tpl.inventory} · EE {tpl.execution_environment}
        </div>
        {#if tpl.ask_limit_on_launch}
          <label class="flex flex-col gap-1">
            <span class="font-semibold">Limit</span>
            <Input aria-label="Limit" placeholder="host pattern, e.g. web*" value={limit} oninput={onLimit} />
          </label>
        {/if}
        {#if tpl.ask_variables_on_launch}
          <label class="flex flex-col gap-1">
            <span class="font-semibold">Extra variables (YAML)</span>
            <textarea
              aria-label="Extra variables"
              rows="4"
              value={extraVars}
              oninput={onVars}
              class="font-mono text-sm rounded-md p-2 bg-[var(--pd-input-field-bg)] text-[var(--pd-input-field-focused-text)] border border-[var(--pd-input-field-stroke)] focus:outline-none focus:border-[var(--pd-input-field-hover-stroke)]"></textarea>
          </label>
        {/if}
      </div>
    {/if}
  {/snippet}
  {#snippet buttons()}
    <Button type="link" onclick={onclose}>Cancel</Button>
    <Button icon={faRocket} onclick={launch} disabled={!tpl}>Launch</Button>
  {/snippet}
</PdModal>
