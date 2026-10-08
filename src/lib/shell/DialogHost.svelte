<script lang="ts">
import { closeDialog, dialogState } from '#lib/dialog.svelte.ts';
</script>

{#if dialogState.current}
  {@const Dialog = dialogState.current.component}
  <Dialog {...dialogState.current.props} onclose={closeDialog} />
{/if}
