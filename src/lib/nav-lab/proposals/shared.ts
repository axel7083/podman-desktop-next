/** Rail items shared by P2/P3: Dashboard, connections grouped, pinned tools. */
import { faBorderAll, faPuzzlePiece, faToolbox, faUser } from '@fortawesome/free-solid-svg-icons';

import DashboardIcon from '#lib/images/DashboardIcon.svelte';
import SettingsIcon from '#lib/images/SettingsIcon.svelte';

import { CONNECTIONS, TOOLS } from '../data.ts';
import type { RailItem } from '../ui/Rail.svelte';

export const PINNED_TOOLS = ['ai-lab', 'mta', 'image-builder', 'mcp'];

export function providerRailItems(): RailItem[] {
  return [
    { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
    ...CONNECTIONS.map(c => ({ id: c.id, label: c.name, connId: c.id, group: c.group })),
    ...TOOLS.filter(t => PINNED_TOOLS.includes(t.id)).map(t => ({ id: `tool:${t.id}`, label: t.name, icon: t.icon, group: 'Tools' })),
    { id: 'tools', label: `All tools (${TOOLS.length})`, icon: faToolbox, group: 'Tools' },
  ];
}

export const BOTTOM_ITEMS: RailItem[] = [
  { id: 'extensions', label: 'Extensions', icon: faPuzzlePiece },
  { id: 'accounts', label: 'Accounts', icon: faUser },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export const ICON_ALL = faBorderAll;
