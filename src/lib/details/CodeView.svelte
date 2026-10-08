<script lang="ts">
/** Read-only code view (stands in for PD's Monaco editor in Inspect / Kube tabs). */
interface Props {
  code: string;
  language?: string;
}

let { code, language = 'json' }: Props = $props();
</script>

<div class="h-full p-4 overflow-auto bg-[var(--pd-details-bg)]">
  <pre
    class="text-sm font-mono leading-5 text-[var(--pd-content-text)] whitespace-pre"
    aria-label="{language} content">{code}</pre>
</div>
