<script lang="ts">
/** Details tab: receives { target, conn, resource }. */
import type { ResourceContext } from '#lib/ext/types.ts';

interface Props {
  ctx: ResourceContext;
}

let { ctx }: Props = $props();
</script>

<div class="p-5 text-[var(--pd-content-text)]">Example tab for {ctx.target} on {ctx.conn.name}.</div>
