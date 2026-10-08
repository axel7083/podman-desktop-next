import type { KubeObject } from '#lib/world.svelte.ts';

type Col = { title: string; width?: string; value: (o: KubeObject) => string };

const s = (o: KubeObject, key: string): unknown => o.status?.[key];
const sp = (o: KubeObject, key: string): unknown => o.spec?.[key];

/** StatusIcon status for a Kubernetes object. */
export function kubeStatus(o: KubeObject): string {
  switch (o.kind) {
    case 'Pod': {
      const phase = String(s(o, 'phase') ?? 'Running');
      return phase === 'Running' ? 'RUNNING' : phase === 'Pending' ? 'STARTING' : phase === 'Succeeded' ? 'CREATED' : 'DEGRADED';
    }
    case 'Deployment': {
      const ready = Number(s(o, 'readyReplicas') ?? 0);
      const want = Number(sp(o, 'replicas') ?? 1);
      return ready === want ? 'RUNNING' : ready === 0 ? 'STARTING' : 'DEGRADED';
    }
    case 'Node':
      return s(o, 'ready') === false ? 'DEGRADED' : 'RUNNING';
    case 'PersistentVolumeClaim':
      return s(o, 'phase') === 'Bound' ? 'USED' : 'STARTING';
    default:
      return String(s(o, 'state') ?? (s(o, 'ready') === false ? 'STARTING' : 'RUNNING')).toUpperCase();
  }
}

const KIND_COLUMNS: Record<string, Col[]> = {
  Node: [
    { title: 'Roles', value: (o): string => String(s(o, 'roles') ?? 'control-plane') },
    { title: 'Version', value: (o): string => String(s(o, 'kubeletVersion') ?? 'v1.34.0') },
    { title: 'OS image', width: '2fr', value: (o): string => String(s(o, 'osImage') ?? 'Debian GNU/Linux 12 (bookworm)') },
  ],
  Deployment: [
    { title: 'Ready', value: (o): string => `${Number(s(o, 'readyReplicas') ?? 0)}/${Number(sp(o, 'replicas') ?? 1)}` },
    { title: 'Image', width: '2fr', value: (o): string => String(sp(o, 'image') ?? '') },
  ],
  Pod: [
    { title: 'Ready', value: (o): string => String(s(o, 'ready') ?? '1/1') },
    { title: 'Restarts', value: (o): string => String(s(o, 'restarts') ?? 0) },
    { title: 'Node', value: (o): string => String(sp(o, 'nodeName') ?? '') },
  ],
  Service: [
    { title: 'Type', value: (o): string => String(sp(o, 'type') ?? 'ClusterIP') },
    { title: 'Cluster IP', value: (o): string => String(sp(o, 'clusterIP') ?? '') },
    { title: 'Ports', value: (o): string => String(sp(o, 'ports') ?? '') },
  ],
  ConfigMap: [{ title: 'Keys', value: (o): string => String(Object.keys((o.spec?.data as Record<string, string>) ?? {}).length) }],
  PersistentVolumeClaim: [
    { title: 'Status', value: (o): string => String(s(o, 'phase') ?? 'Pending') },
    { title: 'Capacity', value: (o): string => String(sp(o, 'storage') ?? '') },
    { title: 'Storage class', value: (o): string => String(sp(o, 'storageClassName') ?? 'standard') },
  ],
};

export function kubeColumns(kinds: string[]): Col[] {
  if (kinds.length === 1) return KIND_COLUMNS[kinds[0]] ?? [];
  if (kinds.includes('ConfigMap')) return [{ title: 'Type', value: (o): string => o.kind }, ...KIND_COLUMNS.ConfigMap];
  return [];
}

/** Minimal YAML serialiser for the Inspect/YAML tab. */
export function toYaml(value: unknown, indent = 0): string {
  const pad = '  '.repeat(indent);
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return value.map(v => `\n${pad}- ${typeof v === 'object' ? toYaml(v, indent + 1).trimStart() : toYaml(v)}`).join('');
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return '{}';
    return entries
      .map(([k, v]) => {
        if (v !== null && typeof v === 'object' && (Array.isArray(v) ? v.length : Object.keys(v).length)) {
          return `\n${pad}${k}:${Array.isArray(v) ? toYaml(v, indent) : toYaml(v, indent + 1)}`;
        }
        return `\n${pad}${k}: ${toYaml(v)}`;
      })
      .join('');
  }
  if (typeof value === 'string') return /[:#\-{}[\],&*?|>!%@`]|^\s|\s$/.test(value) || value === '' ? JSON.stringify(value) : value;
  return String(value);
}

/** KubeObject without the UI helper fields, for YAML display. */
export function cleanKube(o: KubeObject): Record<string, unknown> {
  const { selected: _selected, name: _name, ...rest } = o;
  return rest;
}
