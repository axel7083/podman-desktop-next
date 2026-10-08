<script lang="ts">
/** Realm selector shared by Clients and Users: keeps the realm in `?realm=`. */
import { Dropdown } from '@podman-desktop/ui-svelte';

import { navigate } from '#lib/nav.ts';

import type { KcRealm } from '../data.ts';

interface Props {
  connId: string;
  section: string;
  realms: KcRealm[];
  value: string;
}

let { connId, section, realms, value }: Props = $props();

const options = $derived(realms.map(r => ({ value: r.realm, label: r.displayName ? `${r.realm} (${r.displayName})` : r.realm })));

function change(v: string): void {
  navigate(`/c/${connId}/${section}?realm=${encodeURIComponent(v)}`);
}
</script>

<div class="flex items-center gap-2">
  <span class="text-sm text-[var(--pd-content-text)]" id="kc-realm-label">Realm</span>
  <Dropdown id="kc-realm" ariaLabel="Realm" {value} {options} onChange={change} class="w-56" />
</div>
