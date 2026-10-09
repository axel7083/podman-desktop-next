/**
 * Round-3 helpers (P12–P14): the visible connection set (lab toggles
 * "Connections: 1 | many" and "Install: Vanilla | All extensions") and the extension pages relevant to a connection.
 */
import { CONNECTIONS, type LabConnection, type LabTool, TOOLS } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import { connVisible, toolVisible } from '../r3/exts.ts';

/** Connections visible in the lab (only podman-machine-default when `conns=one`). */
export function labConns(): LabConnection[] {
  return lab.conns === 'one' ? CONNECTIONS.filter(c => c.id === 'podman-machine-default') : CONNECTIONS.filter(connVisible);
}

/** Switcher group header for a connection group (today's PD wording). */
export function switchGroup(c: LabConnection): 'Engines' | 'Kubernetes' | 'Other' {
  return c.group === 'VMs & services' ? 'Other' : c.group;
}

/** Extension pages shown for every connection. */
const GLOBAL_PAGES = ['ai-lab', 'mta', 'mcp'];

/** Extension pages relevant to a connection type. */
const PAGES_BY_GROUP: Record<LabConnection['group'], string[]> = {
  Engines: ['bootc', 'image-builder', 'devcontainers'],
  Kubernetes: ['helm', 'kreate', 'konflux'],
  'VMs & services': ['ansible', 'satellite'],
};

/** Extension pages for the selected connection: connection-relevant first, then the global ones. */
export function extPagesFor(c: LabConnection | undefined): LabTool[] {
  const ids = [...(c ? PAGES_BY_GROUP[c.group] : []), ...GLOBAL_PAGES];
  return ids.map(id => TOOLS.find(t => t.id === id)).filter((t): t is LabTool => !!t && toolVisible(t));
}
