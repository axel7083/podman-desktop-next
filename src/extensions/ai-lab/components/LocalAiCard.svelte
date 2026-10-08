<script lang="ts">
/** Dashboard card (P17): local AI at a glance. */
import { Button } from '@podman-desktop/ui-svelte';

import { navigate } from '#lib/nav.ts';

import { ai, GPU, toolHref } from '../shared.ts';

const st = $derived(ai());
const running = $derived(st.services.filter(s => s.status === 'running').length);

function open(): void {
  navigate(toolHref('services'));
}
</script>

<div class="flex flex-col gap-1 text-sm text-[var(--pd-content-card-text)]">
  <div class="text-base text-[var(--pd-content-card-header-text)]">Podman AI Lab</div>
  <div><b class="text-[var(--pd-content-card-header-text)]">{st.downloaded.length}</b> models downloaded · <b class="text-[var(--pd-content-card-header-text)]">{running}</b> {running === 1 ? 'service' : 'services'} running · <b class="text-[var(--pd-content-card-header-text)]">{st.apps.length}</b> {st.apps.length === 1 ? 'app' : 'apps'}</div>
  <div class="text-xs">{GPU.model} · {GPU.vramGB} GB · CUDA ready</div>
  <div><Button type="link" padding="p-0" onclick={open}>Open AI Lab services</Button></div>
</div>
