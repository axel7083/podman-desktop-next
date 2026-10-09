/**
 * P13 image supply chain (Hummingbird → checks → Quay + Trusted Artifact
 * Signer → Deploy to OpenShift / Kubernetes): gates computed per image, the
 * push and deploy tasks, and the provenance events they record
 * (built → scanned → signed → pushed → deployed).
 */
import { conn, type LabResource, type LabTarget } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import { hash } from './details.ts';
import { installExt } from './exts.ts';
import { addChain, addResource, flows, runTask, sha } from './flows.svelte.ts';
import { selectedNs, setNs } from './kube-ns.svelte.ts';
import { live } from './live.svelte.ts';

export type Gate = 'pass' | 'warn' | 'fail';

/** Deploy targets: [connId, label, namespace, route kind]. */
export const DEPLOY_TARGETS: [string, string, string, 'Route' | 'Ingress'][] = [
  ['sandbox', 'Developer Sandbox', 'jdeveloper-dev', 'Route'],
  ['openshift-local', 'OpenShift Local', 'orders', 'Route'],
  ['minc', 'MicroShift (minc)', 'demo', 'Route'],
  ['kind-dev', 'Kind', 'default', 'Ingress'],
];

const hardened = (image: string): boolean => image.includes('hummingbird');

/** Grype result of an image: [gate, summary]. */
export function grypeGate(image: string): [Gate, string] {
  if (hardened(image)) return ['pass', '0 vulnerabilities'];
  const h = hash(image);
  const crit = h % 4 === 0 ? 1 : 0;
  const high = (h % 5) + 1;
  return [crit ? 'fail' : 'warn', `${crit} critical · ${high} high · ${(h % 9) + 4} medium`];
}

/** Image checker for OpenShift result: [gate, summary]. */
export function openshiftGate(image: string): [Gate, string] {
  if (hardened(image)) return ['pass', '4/4 checks passed'];
  const h = hash(image);
  const warns = (h % 2 ? 1 : 0) + (h % 3 ? 0 : 1);
  return [warns ? 'warn' : 'pass', warns ? `${4 - warns}/4 passed · ${warns} warning${warns > 1 ? 's' : ''}` : '4/4 checks passed'];
}

/** Repository of an image on quay.io (`quay.io/acme/<name>`). */
export function quayRepo(image: string): string {
  const repo = image.split(/:(?=[^:/]+$)/)[0].split('/').pop() ?? 'app';
  return `quay.io/acme/${repo}`;
}

export function imageTag(image: string): string {
  return image.split(/:(?=[^:/]+$)/)[1] ?? 'latest';
}

/** Short app name of an image (`orders-api`). */
export function appName(image: string): string {
  return (image.split(/:(?=[^:/]+$)/)[0].split('/').pop() ?? 'app').replace(/[^a-z0-9-]/g, '-');
}

export function pushedRef(image: string): string | undefined {
  return flows.chain[image]?.find(e => e.step === 'pushed')?.detail;
}

/** podman push to Quay, optionally keyless-signed with RHTAS (cosign → Fulcio → Rekor). */
export function pushToQuay(r: LabResource, o: { repo: string; tag: string; sign: boolean }): void {
  installExt('quay');
  if (o.sign) installExt('tas');
  const dest = `${o.repo}:${o.tag}`;
  const digest = `sha256:${sha(dest, 64)}`;
  const rekor = 48213377 + (hash(dest) % 9000);
  const target: LabTarget = { kind: 'resource', connId: r.connId, sectionId: r.sectionId, resId: r.id };
  lab.panel = true;
  runTask({
    title: `Push ${appName(r.name)}`,
    connId: r.connId,
    icon: 'icons/redhat.quay.png',
    label: o.sign ? 'podman push + cosign sign' : 'podman push',
    target,
    cmd: `podman push ${r.name} ${dest}`,
    lines: [
      'Getting image source signatures',
      `Copying blob sha256:${sha(r.name + '1')} done`,
      `Copying blob sha256:${sha(r.name + '2')} done`,
      'Copying config done | Writing manifest to image destination',
      `${o.tag}: digest: ${digest.slice(0, 19)}… size: 2417`,
      ...(o.sign
        ? [
            `$ cosign sign -y ${o.repo}@${digest.slice(0, 19)}…`,
            'Retrieving signed certificate… (OIDC: sso.acme-corp.com/realms/trusted-artifact-signer)',
            'Successfully verified SCT…',
            `tlog entry created with index: ${rekor}`,
            `Pushing signature to: ${o.repo}`,
          ]
        : []),
      'Quay security scan (Clair): queued → scanned',
      `✔ Pushed ${dest}${o.sign ? ` · signed by ${flows.account?.email ?? 'alice.dev@acme-corp.com'}` : ''}`,
    ],
    done: () => {
      if (o.sign)
        addChain(r.name, {
          step: 'signed',
          title: 'Signed',
          detail: `${flows.account?.email ?? 'alice.dev@acme-corp.com'} · Rekor #${rekor}`,
          at: 'just now',
          href: `https://rekor-server-trusted-artifact-signer.apps.ocp.acme-corp.com/api/v1/log/entries?logIndex=${rekor}`,
        });
      addChain(r.name, { step: 'pushed', title: 'Pushed', detail: dest, at: 'just now', href: `https://${o.repo}?tab=tags` });
    },
  });
}

/** Kubernetes manifests generated for a deploy (Deployment + Service + Route / Ingress). */
export function manifests(app: string, image: string, ns: string, kind: 'Route' | 'Ingress', host: string): string[] {
  return [
    'apiVersion: apps/v1',
    'kind: Deployment',
    'metadata:',
    `  name: ${app}`,
    `  namespace: ${ns}`,
    `  labels: { app: ${app}, app.kubernetes.io/managed-by: podman-desktop }`,
    'spec:',
    '  replicas: 1',
    `  selector: { matchLabels: { app: ${app} } }`,
    '  template:',
    `    metadata: { labels: { app: ${app} } }`,
    '    spec:',
    '      containers:',
    `        - name: ${app}`,
    `          image: ${image}`,
    '          ports: [{ containerPort: 8080 }]',
    '          securityContext: { runAsNonRoot: true, allowPrivilegeEscalation: false }',
    '---',
    'apiVersion: v1',
    'kind: Service',
    `metadata: { name: ${app}, namespace: ${ns} }`,
    `spec: { selector: { app: ${app} }, ports: [{ port: 8080, targetPort: 8080 }] }`,
    '---',
    ...(kind === 'Route'
      ? ['apiVersion: route.openshift.io/v1', 'kind: Route', `metadata: { name: ${app}, namespace: ${ns} }`, `spec: { host: ${host}, to: { kind: Service, name: ${app} }, tls: { termination: edge } }`]
      : ['apiVersion: networking.k8s.io/v1', 'kind: Ingress', `metadata: { name: ${app}, namespace: ${ns} }`, `spec: { rules: [{ host: ${host}, http: { paths: [{ path: /, pathType: Prefix, backend: { service: { name: ${app}, port: { number: 8080 } } } }] } }] }`]),
  ];
}

export function hostFor(app: string, connId: string, ns: string): string {
  if (connId === 'sandbox') return `${app}-${ns}.apps.rm2.thpm.p1.openshiftapps.com`;
  if (connId === 'openshift-local') return `${app}-${ns}.apps-crc.testing`;
  if (connId === 'minc') return `${app}-${ns}.apps.127.0.0.1.nip.io`;
  return `${app}.localtest.me`;
}

/** kubectl / oc apply of the generated manifests; adds Deployment, Pod, Service, Route to the cluster. */
export function deployTo(r: LabResource, connId: string): void {
  const t = DEPLOY_TARGETS.find(x => x[0] === connId);
  if (!t) return;
  const [, label, ns, kind] = t;
  const app = appName(r.name);
  const image = pushedRef(r.name) ?? r.name;
  const host = hostFor(app, connId, ns);
  const cli = kind === 'Route' ? 'oc' : 'kubectl';
  const dep: LabTarget = { kind: 'resource', connId, sectionId: 'deployments', resId: `${connId}/deployments/${ns}/${app}` };
  live.status[`conn:${connId}`] = 'running';
  lab.panel = true;
  runTask({
    title: `Deploy ${app}`,
    connId,
    icon: conn(connId)?.icon,
    label: `${cli} apply`,
    target: dep,
    cmd: `${cli} apply -n ${ns} -f ${app}-deploy.yaml`,
    lines: [
      ...(connId === 'kind-dev' && !pushedRef(r.name) ? [`$ kind load docker-image ${image} --name dev`, `Image: "${image}" with ID "sha256:${sha(image)}" not yet present on node "dev-control-plane", loading...`] : []),
      `deployment.apps/${app} created`,
      `service/${app} created`,
      `${kind === 'Route' ? 'route.route.openshift.io' : 'ingress.networking.k8s.io'}/${app} created`,
      `$ ${cli} rollout status deployment/${app} -n ${ns}`,
      `Waiting for deployment "${app}" rollout to finish: 0 of 1 updated replicas are available...`,
      `deployment "${app}" successfully rolled out`,
      `✔ ${app} is available at https://${host} (${label})`,
    ],
    done: () => {
      const pod = `${app}-${sha(app + connId, 10)}-${sha(connId, 5)}`;
      const age = '1 minute';
      addResource({ id: dep.resId!, name: app, connId, sectionId: 'deployments', status: 'running', sub: '1/1 ready', age, ns, cols: { ready: '1/1', upToDate: '1', available: '1', image } });
      addResource({ id: `${connId}/kpods/${ns}/${pod}`, name: pod, connId, sectionId: 'kpods', status: 'running', sub: '1/1 ready', age, ns, cols: { ready: '1/1', status: 'Running', restarts: '0', node: `${connId}-control-plane`, ip: `10.217.0.${hash(pod) % 250}`, image } });
      addResource({ id: `${connId}/services/${ns}/${app}`, name: app, connId, sectionId: 'services', status: 'ready', sub: 'ClusterIP 8080/TCP', age, ns, cols: { type: 'ClusterIP', clusterIP: `10.217.${hash(app) % 250}.${hash(ns) % 250}`, ports: '8080/TCP', selector: `app=${app}` } });
      addResource({ id: `${connId}/routes/${ns}/${app}`, name: app, connId, sectionId: 'routes', status: 'ready', sub: host, age, ns, cols: { host, path: '/', service: app, tls: kind === 'Route' ? 'edge' : '—', kind } });
      const sel = selectedNs(connId);
      if (!sel.includes('*') && !sel.includes(ns)) setNs(connId, [...sel, ns]);
      addChain(r.name, { step: 'deployed', title: `Deployed to ${label}`, detail: `${ns}/${app} · https://${host}`, at: 'just now', target: dep });
    },
  });
}
