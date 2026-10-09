/**
 * P13 Hummingbird actions: pull a hardened image, rebuild a local image on its
 * hardened alternative. Both run as a task in the bottom panel (scripted
 * output) and add the resulting image to the connection's Images list.
 */
import { type LabResource, type LabTarget, RESOURCES } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import { altFor, type HardenedImage, hbImage, hbNodeId, hbRef, mb } from './hb-data.ts';
import { live } from './live.svelte.ts';

const ICON = 'icons/redhat.hummingbird.png';

/** Add an image to the Images list of a connection (reactive through `live.added`). */
export function addImage(connId: string, name: string, sizeMB: number): void {
  const id = `${connId}/images/${name}`;
  if (RESOURCES.some(r => r.id === id && !live.deleted.includes(id))) return;
  const r: LabResource = { id, name, connId, sectionId: 'images', status: 'ready', sub: `${sizeMB} MB`, age: '1 minute' };
  RESOURCES.push(r);
  live.deleted = live.deleted.filter(x => x !== id);
  live.added = [...live.added, id];
}

function task(id: string, title: string, connId: string, first: string, script: string[], target: LabTarget): void {
  lab.addSession({ id, kind: 'logs', title, label: 'task output', connId, lines: [first], script: [...script], stream: true, target, icon: ICON });
}

const sha = (s: string): string => {
  let h = 7;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (h * 2654435761).toString(16).padEnd(12, '0').slice(0, 12);
};

/** `podman pull` of a catalog image; status in `live.status['hb-pull:<ref>']`. */
export function pullHardened(h: HardenedImage, connId: string, tag = h.tags[0]): void {
  const ref = hbRef(h, tag);
  const key = `hb-pull:${ref}`;
  if (live.status[key]) return;
  live.status[key] = 'pulling';
  task(`hb-pull-${ref}`, `Pull ${h.name}:${tag}`, connId, `$ podman pull ${ref}`, [
    `Trying to pull ${ref}...`,
    'Getting image source signatures',
    'Checking if image destination supports signatures',
    `Copying blob sha256:${sha(ref)}…`,
    'Copying config sha256:' + sha(ref + 'c') + '…',
    'Writing manifest to image destination',
    'Storing signatures',
    `✔ Pulled ${ref} (${mb(h.sizeMB)}, signature verified)`,
  ], { kind: 'node', connId, nodeId: hbNodeId(connId, 'Catalog', `hummingbird/${h.name}`) });
  setTimeout(() => {
    addImage(connId, ref, h.sizeMB);
    live.status[key] = 'pulled';
  }, 2200);
}

export const pullState = (h: HardenedImage, tag = h.tags[0]): string | undefined => live.status[`hb-pull:${hbRef(h, tag)}`];

/** Name of the image rebuilt on the hardened base. */
export function rebuiltName(local: string): string {
  const [repo, tag] = local.split(/:(?=[^:/]+$)/);
  return `${repo}:${tag ?? 'latest'}-hummingbird`;
}

/** Rebuild a local image on its hardened alternative; status in `live.status['hb-rebuild:<local>']`. */
export function rebuildOnHardened(local: string, connId: string): void {
  const a = altFor(local);
  const h = hbImage(a?.hb);
  if (!a || !h) return;
  const key = `hb-rebuild:${local}`;
  if (live.status[key] === 'rebuilding') return;
  live.status[key] = 'rebuilding';
  const out = rebuiltName(local);
  const from = hbRef(h);
  task(`hb-rebuild-${local}`, `Rebuild ${local.split('/').pop()}`, connId, `$ podman build -t ${out} -f Containerfile.hummingbird .`, [
    `STEP 1/5: FROM ${hbRef(h, `${h.tags[0]}-builder`)} AS build`,
    `STEP 2/5: COPY --from=${local} / /src`,
    `STEP 3/5: FROM ${from}`,
    'STEP 4/5: COPY --from=build /src/app /app',
    'STEP 5/5: USER 65532',
    `COMMIT ${out}`,
    `--> ${sha(out)}`,
    `Successfully tagged ${out}`,
    `✔ Rebuilt on ${from}: ${mb(a.sizeMB)} → ${mb(h.sizeMB)}, CVEs ${a.cves.critical + a.cves.high + a.cves.medium + a.cves.low} → 0`,
  ], { kind: 'node', connId, nodeId: hbNodeId(connId, 'Alternatives', local) });
  setTimeout(() => {
    addImage(connId, out, h.sizeMB);
    live.status[key] = 'rebuilt';
  }, 3000);
}

export const rebuildState = (local: string): string | undefined => live.status[`hb-rebuild:${local}`];

/** Open the comparison tab (current vs hardened) of a local image. */
export function openAlternative(local: string, connId: string, onopen: (t: LabTarget, o: { preview?: boolean }) => void): void {
  onopen({ kind: 'node', connId, nodeId: hbNodeId(connId, 'Alternatives', local) }, {});
}
