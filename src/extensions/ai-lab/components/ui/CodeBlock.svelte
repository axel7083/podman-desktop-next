<script lang="ts">
/** Read-only code snippet with a copy button (AI Lab "Client code"). */
import { faCheck, faCopy } from '@fortawesome/free-solid-svg-icons';
import { Icon } from '@podman-desktop/ui-svelte/icons';

interface Props {
  code: string;
  label?: string;
  maxHeight?: string;
  /** Wrap long lines (dialogs). */
  wrap?: boolean;
}

let { code, label = 'Code snippet', maxHeight = '22rem', wrap = false }: Props = $props();
let copied = $state(false);

function copy(): void {
  navigator.clipboard?.writeText(code).catch(() => undefined);
  copied = true;
  setTimeout(() => (copied = false), 1500);
}
</script>

<div class="relative rounded-md bg-[var(--pd-code-block-bg)] ring-1 ring-inset ring-[var(--pd-code-block-border)]">
  <button
    class="absolute top-2 right-2 rounded-md border border-[var(--pd-button-secondary-border)] px-2 py-1 text-[var(--pd-terminal-foreground)] hover:bg-[var(--pd-link-hover-bg)]"
    title="Copy to clipboard"
    aria-label="Copy {label}"
    onclick={copy}>
    <Icon icon={copied ? faCheck : faCopy} />
  </button>
  <pre class="p-4 pr-14 overflow-auto text-xs leading-5 font-mono text-[var(--pd-terminal-foreground)]" class:whitespace-pre={!wrap} class:whitespace-pre-wrap={wrap} class:break-all={wrap} style:max-height={maxHeight} aria-label={label}>{code}</pre>
</div>
