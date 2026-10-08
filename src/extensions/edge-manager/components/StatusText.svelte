<script lang="ts">
/** flightctl status label with a coloured dot. */
interface Props {
  value: string;
}

let { value }: Props = $props();

const GOOD = ['Online', 'UpToDate', 'Healthy', 'Approved', 'Enrolled'];
const BUSY = ['Updating', 'Rebooting', 'Pending', 'AwaitingReconnect'];
const BAD = ['Error', 'Degraded', 'OutOfDate', 'Denied'];
const cls = $derived(GOOD.includes(value) ? 'bg-[var(--pd-status-running)]' : value === 'Pending' ? 'bg-[var(--pd-state-warning)]' : BUSY.includes(value) ? 'bg-[var(--pd-status-starting)]' : BAD.includes(value) ? 'bg-[var(--pd-status-terminated)]' : 'bg-[var(--pd-status-stopped)]');
/** `UpToDate` → `Up to date` (flightctl enum → sentence case). */
const label = $derived(value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/ (\w)/g, (_m, c: string) => ` ${c.toLowerCase()}`));
</script>

<span class="inline-flex items-center gap-1.5 text-sm"><span class="w-2 h-2 rounded-full {cls}"></span>{label}</span>
