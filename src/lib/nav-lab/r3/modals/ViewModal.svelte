<script lang="ts">
/**
 * P13 Views: name, icon and icon colour of a view. Opens when saving a new view
 * (`mode: save`), and from Rename / Change icon on an existing one.
 */
import { faFloppyDisk } from '@fortawesome/free-solid-svg-icons';

import LabIcon from '../../ui/LabIcon.svelte';
import { closeModal, flows } from '../flows.svelte.ts';
import { colorOf, DEFAULT_ICON, iconOf, VIEW_COLORS, VIEW_ICONS } from '../view-style.ts';
import { customize, isSaved, save, viewColorKey, viewIconKey, viewName } from '../views.svelte.ts';
import Field from './Field.svelte';
import { INPUT } from './form.ts';
import Modal from './Modal.svelte';

const data = flows.modal?.data ?? {};
const id = data.id ?? '';
const saving = data.mode === 'save';

let name = $state(isSaved(id) ? viewName(id) : '');
let icon = $state(viewIconKey(id) ?? DEFAULT_ICON);
let color = $state(viewColorKey(id) ?? 'default');
let nameInput = $state<HTMLInputElement>();

const valid = $derived(name.trim() !== '');

function submit(): void {
  if (!valid) return;
  customize(id, { name: name.trim(), icon, color });
  if (saving) save(id);
  closeModal();
}

$effect(() => {
  if (data.focus === 'icon') return;
  nameInput?.focus();
  nameInput?.select();
});
</script>

<Modal title={saving ? 'Save view' : 'Customize view'} icon={iconOf(icon)} primary={saving ? 'Save view' : 'Apply'} primaryIcon={saving ? faFloppyDisk : undefined} disabled={!valid} width="26rem" testid="view-modal" onprimary={submit}>
  <Field label="Name">
    <input
      bind:this={nameInput}
      bind:value={name}
      class={INPUT}
      placeholder="Orders app"
      data-testid="view-modal-name"
      aria-label="View name"
      onkeydown={(e): void => {
        if (e.key === 'Enter') submit();
      }} />
  </Field>
  <Field label="Icon">
    <div role="radiogroup" aria-label="Icon" class="grid grid-cols-9 gap-1">
      {#each Object.entries(VIEW_ICONS) as [key, def] (key)}
        <button
          type="button"
          role="radio"
          aria-checked={icon === key}
          aria-label={key}
          title={key}
          data-testid="view-icon-{key}"
          class="flex items-center justify-center h-8 rounded-md border {icon === key ? 'border-[var(--pd-tab-highlight)] bg-[var(--pd-action-button-details-bg)]' : 'border-transparent hover:bg-[var(--pd-action-button-details-bg)]'}"
          onclick={(): void => void (icon = key)}>
          <LabIcon icon={def} size={14} color={colorOf(color)} />
        </button>
      {/each}
    </div>
  </Field>
  <Field label="Icon color">
    <div role="radiogroup" aria-label="Icon color" class="flex items-center gap-1.5">
      {#each Object.entries(VIEW_COLORS) as [key, c] (key)}
        <button
          type="button"
          role="radio"
          aria-checked={color === key}
          aria-label={c.label}
          title={c.label}
          data-testid="view-color-{key}"
          class="flex items-center justify-center w-7 h-7 rounded-full border-2 {color === key ? 'border-[var(--pd-tab-highlight)]' : 'border-transparent'}"
          onclick={(): void => void (color = key)}>
          <span class="w-4 h-4 rounded-full border border-[var(--pd-content-divider)]" style:background={c.token ? `var(${c.token})` : 'var(--pd-modal-text)'}></span>
        </button>
      {/each}
    </div>
  </Field>
</Modal>
