/** zot repositories (`GET /v2/_catalog`, `/v2/<repo>/tags/list`, referrers). */
import { extData } from '#lib/world.svelte.ts';

export const LR = 'podman-desktop.local-registry';

export interface Repo {
  name: string;
  tags: string[];
  artifactType?: string;
  referrers?: { subject: string; artifactType: string }[];
  pushed?: number;
}

export const SEED_REPOS: Repo[] = [
  {
    name: 'acme/orders-api',
    tags: ['2.2'],
    referrers: [{ subject: 'acme/orders-api@sha256:7f3c1d9a', artifactType: 'application/vnd.cyclonedx+json' }],
  },
  { name: 'acme/payments-api', tags: ['1.5.0'], referrers: [{ subject: 'acme/payments-api@sha256:2a9e4c7b', artifactType: 'application/vnd.dev.sigstore.bundle.v0.3+json' }] },
  { name: 'acme/ee-network', tags: ['1.0'] },
  { name: 'charts/orders', tags: ['0.4.0'], artifactType: 'application/vnd.cncf.helm.config.v1+json' },
];

export function repos(): Repo[] {
  return extData<Repo[]>(LR, 'repos', structuredClone(SEED_REPOS));
}

export function addTag(repo: string, tag: string): void {
  const list = repos();
  const r = list.find(x => x.name === repo);
  if (r) {
    if (!r.tags.includes(tag)) r.tags.unshift(tag);
    r.pushed = Date.now();
  } else list.unshift({ name: repo, tags: [tag], pushed: Date.now() });
}
