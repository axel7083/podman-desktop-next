/** Skupper v2 (`skupper.io/v2alpha1`) Site / Link / Listener / Connector / AccessGrant objects. */
import { kube, type KubeObject, world } from '#lib/world.svelte.ts';

export const SKUPPER_ID = 'redhat.service-interconnect';
export const SKUPPER_KINDS = ['Site', 'Link', 'Listener', 'Connector', 'AccessGrant'];
const API = 'skupper.io/v2alpha1';

export function site(name: string, ns: string, platform: string, linkAccess: string, sitesInNetwork: number): KubeObject {
  return kube(API, 'Site', name, ns, { linkAccess, ha: false }, { state: 'RUNNING', status: 'Ready', platform, sitesInNetwork, version: '2.2.0' }, { d: 6 });
}

export function link(name: string, ns: string, remote: string): KubeObject {
  return kube(API, 'Link', name, ns, { endpoints: [{ name: 'inter-router', host: `skupper-inter-router-payments.apps.${remote.replace('-payments', '')}.acme.internal`, port: '443' }], cost: 1, tlsCredentials: name }, { state: 'RUNNING', status: 'Ready', remoteSiteName: remote }, { m: 0 });
}

export function listener(name: string, ns: string, routingKey: string, host: string, port: number, matched: boolean): KubeObject {
  return kube(API, 'Listener', name, ns, { routingKey, host, port }, { state: matched ? 'RUNNING' : 'STARTING', status: matched ? 'Ready' : 'Pending', hasMatchingConnector: matched }, { m: 0 });
}

export function connector(name: string, ns: string, routingKey: string, target: { host?: string; selector?: string }, port: number, matched: boolean): KubeObject {
  return kube(API, 'Connector', name, ns, { routingKey, ...target, port }, { state: matched ? 'RUNNING' : 'STARTING', status: matched ? 'Ready' : 'Pending', hasMatchingListener: matched }, { d: 1 });
}

export function grant(name: string, ns: string): KubeObject {
  const exp = new Date(Date.now() + 15 * 60_000).toISOString();
  return kube(API, 'AccessGrant', name, ns, { redemptionsAllowed: 1, expirationWindow: '15m' }, { state: 'CREATED', status: 'Ready', redeemed: 1, url: 'https://skupper-grant-server-payments.apps.ocp-dev.acme.internal:443/2c4f8e1a-6b3d-4a9e-9f7c-1d5e3b8a0c2f', expirationTime: exp }, { m: 0 });
}

export function skupperObjects(connId: string): KubeObject[] {
  return (world.kube[connId] ?? []).filter(o => SKUPPER_KINDS.includes(o.kind));
}

export function hasCrd(connId: string, name: string): boolean {
  return (world.kube[connId] ?? []).some(o => o.kind === 'CustomResourceDefinition' && o.metadata.name === name);
}

export function linkedTo(connId: string): string | undefined {
  return skupperObjects(connId).find(o => o.kind === 'Link')?.status?.remoteSiteName as string | undefined;
}
