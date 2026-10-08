<script lang="ts">
/** Release status, coloured like `helm list` states. */
import { type ReleaseStatus, STATUS_CLASS } from '../data.ts';

interface Props {
  object: ReleaseStatus;
}

let { object }: Props = $props();
</script>

<span class="text-sm font-medium {STATUS_CLASS[object]}" aria-label="Status {object}">{object}</span>
