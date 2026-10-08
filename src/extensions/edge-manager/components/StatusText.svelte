<script lang="ts">
/** flightctl status label with a coloured dot. */
interface Props {
  value: string;
}

let { value }: Props = $props();

const GOOD = ['Online', 'UpToDate', 'Healthy', 'Approved', 'Enrolled'];
const BUSY = ['Updating', 'Rebooting', 'Pending', 'AwaitingReconnect'];
const BAD = ['Error', 'Degraded', 'OutOfDate', 'Denied'];
const cls = $derived(GOOD.includes(value) ? 'bg-[var(--pd-status-running)]' : BUSY.includes(value) ? 'bg-[var(--pd-status-starting)]' : BAD.includes(value) ? 'bg-[var(--pd-status-terminated)]' : 'bg-[var(--pd-status-stopped)]');
</script>

<span class="inline-flex items-center gap-1.5 text-sm"><span class="w-2 h-2 rounded-full {cls}"></span>{value}</span>
