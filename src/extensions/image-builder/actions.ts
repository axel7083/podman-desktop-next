/** Image Builder actions: compose (as a task), download, quick fixes. */
import { later, runTask, toast } from '#lib/world.svelte.ts';

import { type Blueprint, type Compose, type ComposeState, EXT, IB_EXT, ibMutable } from './data.ts';

const S3 = 'https://image-builder-service-production.s3.amazonaws.com';
const advancing = new Set<string>();

function setStatus(id: string, status: ComposeState, error?: Compose['image_status']['error']): void {
  const s = ibMutable();
  s.composes = s.composes.map(c =>
    c.id === id
      ? {
          ...c,
          image_status: {
            status,
            ...(status === 'success' ? { upload_status: { type: 'aws.s3' as const, status: 'success' as const, options: { url: `${S3}/composer-api-${id.slice(0, 8)}-${EXT[c.image_type]}?X-Amz-Expires=21600` } } } : {}),
            ...(error ? { error } : {}),
          },
        }
      : c,
  );
}

/** Simulate the remaining lifecycle of a compose (pending → building → uploading → success). */
export function advance(c: Compose, fail?: Compose['image_status']['error']): void {
  if (advancing.has(c.id)) return;
  advancing.add(c.id);
  const order: ComposeState[] = ['pending', 'building', 'uploading', 'success'];
  const durations: Record<string, number> = { pending: 1500, building: 6000, uploading: 2000 };
  let t = 0;
  for (let i = Math.max(0, order.indexOf(c.image_status.status)); i < order.length - 1; i++) {
    t += durations[order[i]];
    const next = order[i + 1];
    later(t, () => {
      if (fail && next === 'uploading') {
        setStatus(c.id, 'failure', fail);
        return;
      }
      setStatus(c.id, next);
    });
  }
}

export function build(bp: Blueprint): void {
  const id = crypto.randomUUID();
  const type = bp.image_requests[0].image_type;
  const compose: Compose = { id, blueprint: bp.name, blueprint_version: bp.version, image_type: type, created_at: new Date().toISOString(), image_status: { status: 'pending' } };
  const s = ibMutable();
  s.composes = [compose, ...s.composes];
  const broken = bp.customizations.packages?.includes('systemd-networkd') && !bp.customizations.custom_repositories?.length;
  const fail = broken ? { reason: 'Error depsolving', details: 'No match for argument: systemd-networkd' } : undefined;
  advance(compose, fail);
  runTask({
    name: `Build ${bp.name} v${bp.version} (${type})`,
    ext: IB_EXT,
    steps: [
      { label: 'pending – queued on console.redhat.com', ms: 1500, log: [`POST /api/image-builder/v1/blueprints/${bp.id}/compose`, `compose id ${id}`] },
      { label: 'building – osbuild pipeline', ms: 6000, log: ['org.osbuild.rpm: installing ' + (bp.customizations.packages?.length ?? 0) + ' packages', 'org.osbuild.selinux', ...(bp.customizations.openscap ? [`org.osbuild.oscap.remediation: ${bp.customizations.openscap.profile_id}`] : [])] },
      { label: 'uploading – aws.s3', ms: 2000 },
    ],
    failAt: fail ? 2 : undefined,
    failMessage: fail ? `${fail.reason}: ${fail.details}` : undefined,
    action: { label: 'Open Image Builder', href: '/tools/image-builder?tab=images' },
  });
}

export function download(c: Compose): void {
  const file = `composer-api-${c.id.slice(0, 8)}-${EXT[c.image_type]}`;
  runTask({
    name: `Download ${file}`,
    ext: IB_EXT,
    steps: [
      { label: `GET ${c.image_status.upload_status?.options.url.split('?')[0] ?? file}`, ms: 2600 },
      { label: 'Verify sha256', ms: 600 },
    ],
    onDone: () => {
      const s = ibMutable();
      s.composes = s.composes.map(x => (x.id === c.id ? { ...x, downloaded: `C:\\Users\\alice\\Downloads\\${file}` } : x));
    },
  });
}

export function addEpel(bpName: string): void {
  const s = ibMutable();
  s.blueprints = s.blueprints.map(b =>
    b.name === bpName
      ? {
          ...b,
          version: b.version + 1,
          last_modified_at: new Date().toISOString(),
          customizations: { ...b.customizations, custom_repositories: [{ id: 'epel9', name: 'EPEL 9', baseurl: ['https://dl.fedoraproject.org/pub/epel/9/Everything/x86_64/'] }] },
        }
      : b,
  );
  toast({ type: 'success', title: `EPEL 9 repository added to ${bpName}`, body: 'Blueprint saved as a new version. Build it again.' });
}
