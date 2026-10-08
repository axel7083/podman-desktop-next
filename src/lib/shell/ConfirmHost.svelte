<script lang="ts">
import { Button } from '@podman-desktop/ui-svelte';

import Dialog from '#lib/components/Dialog.svelte';
import { confirmState } from '#lib/confirm.svelte.ts';

function answer(ok: boolean): void {
  const req = confirmState.current;
  confirmState.current = undefined;
  req?.resolve(ok);
}

function cancel(): void {
  answer(false);
}

function accept(): void {
  answer(true);
}
</script>

{#if confirmState.current}
  {@const req = confirmState.current}
  <Dialog title={req.title} onclose={cancel}>
    {#snippet content()}<p>{req.message}</p>{/snippet}
    {#snippet buttons()}
      <Button type="link" onclick={cancel}>Cancel</Button>
      <Button type={req.variant === 'danger' ? 'danger' : 'primary'} onclick={accept}>{req.buttonLabel}</Button>
    {/snippet}
  </Dialog>
{/if}
