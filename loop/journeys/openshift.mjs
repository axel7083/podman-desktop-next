// OpenShift journey (docs/research/_openshift-scenario.md): the 5 click-through
// journeys + OLM, CLI pack and the Red Hat account. Runs at speed 5.
export const scenario = 'openshift';

/** @param {Awaited<ReturnType<typeof import('../lib.mjs').launch>>} t */
export async function journey(t) {
  const { page } = t;
  const P = { speed: '5' };
  /** Wait for a "<name> completed" toast. */
  const done = async (text, timeout = 20000) => {
    await page.getByText(new RegExp(`${text}.*completed`)).first().waitFor({ timeout });
    // wait until the world (with the task's side effects) is persisted
    await page.waitForFunction(
      prefix => (JSON.parse(localStorage.getItem('pdn:dev:world.openshift') ?? '{}').tasks ?? []).some(x => x.name.startsWith(prefix) && x.status === 'success'),
      text,
      { timeout: 8000 },
    );
    await page.waitForTimeout(400);
  };
  /** Read the persisted world (ids are random). */
  const world = async () => {
    await page.waitForTimeout(450);
    return page.evaluate(() => JSON.parse(localStorage.getItem('pdn:dev:world.openshift') ?? '{}'));
  };
  const imageId = async (name, tag) => (await world()).images.find(i => i.name === name && i.tag === tag).id;
  const containerId = async name => (await world()).containers.find(c => c.name === name).id;
  const kebab = async item => {
    await page.getByRole('button', { name: 'kebab menu' }).last().click();
    await page.getByText(item, { exact: true }).click();
  };
  const confirmDialog = async (shot, button) => {
    const btn = page.getByRole('dialog').getByRole('button', { name: button, exact: true });
    await btn.waitFor();
    await t.shot(shot);
    await btn.click();
  };

  // ---------------------------------------------------------------- dashboard
  await t.open('/', P);
  await t.shot('dashboard');

  // ------------------------------------- J1 connect to my real clusters (OCM)
  await t.open('/tools/openshift-cluster-manager', P);
  await page.getByRole('table').waitFor();
  await t.shot('ocm-clusters');
  await page.getByRole('button', { name: 'Connect to ocp-dev' }).click();
  await confirmDialog('ocm-update-oc-dialog', 'Update and connect');
  await done('Update oc');
  await page.waitForTimeout(400);
  await t.shot('ocm-login-progress');
  await done('Log in to ocp-dev');
  await t.open('/c/ocp-dev', P);
  await page.getByRole('link', { name: 'Virtual machines' }).first().waitFor();
  await t.shot('ocp-dev-connected');
  await page.locator('a', { hasText: 'Cluster' }).first().click();
  await t.shot('ocp-dev-cluster-tab');

  // ------------------------------------------------------- J2 ship safely
  const api150 = await imageId('quay.io/acme/payments-api', '1.5.0');
  await t.open(`/c/podman-machine-default/images/${api150}/security`, P);
  await page.getByText('Breaks build').first().waitFor();
  await page.waitForTimeout(800);
  await t.shot('image-security-acs-failing');
  await kebab('Push and scan');
  await page.getByText(/Push and scan .* failed/).first().waitFor({ timeout: 15000 });
  await t.shot('push-blocked-by-acs');
  await kebab('Rebuild on latest UBI 9');
  await done('Rebuild');
  await page.locator('a', { hasText: 'Summary' }).first().click();
  await page.locator('a', { hasText: 'Security' }).first().click();
  await page.waitForTimeout(1500);
  await kebab('Push and scan');
  await t.shot('push-and-scan-progress');
  await done('Push and scan');
  await t.open(`/c/podman-machine-default/images/${api150}/security`, P);
  await page.getByText('CVE-2026-0915').first().waitFor();
  await page.waitForTimeout(800);
  await t.shot('image-security-clean-and-clair');
  await t.open('/c/podman-machine-default/images', P);
  await page.getByRole('table').waitFor();
  await t.shot('images-pushed-badge');

  await t.open('/c/ocp-dev/pipelines', P);
  await page.getByRole('table').waitFor();
  await t.shot('pipelines');
  await t.open('/c/ocp-dev/kube/PipelineRun~payments-ci~payments-api-build-x7k2p/tasks', P);
  await page.getByRole('region', { name: 'Failed task log' }).waitFor();
  await t.shot('pipelinerun-failed-tasks');
  await page.getByRole('button', { name: 'Rerun' }).click();
  await page.waitForTimeout(1200);
  await t.shot('pipelinerun-rerun-progress');
  await done('Rerun payments-api-build');
  await t.open('/c/ocp-prod/gitops', P);
  await page.getByRole('table').waitFor();
  await t.shot('gitops-outofsync');
  await page.getByRole('row', { name: /payments-prod/ }).getByRole('button', { name: 'Sync' }).click();
  await done('Sync payments-prod');
  await t.shot('gitops-synced');

  // ------------------------------------ J3 OpenShift Console on my laptop (minc)
  await t.open('/c/minc', { ...P, tab: 'addons' });
  await t.shot('minc-addons');
  await page.getByRole('button', { name: 'Install', exact: true }).first().click();
  await confirmDialog('minc-console-auth-warning', 'Install');
  await page.waitForTimeout(800);
  await t.shot('minc-console-installing');
  await done('Install OpenShift Console');
  await t.shot('minc-console-installed');
  await page.getByRole('button', { name: 'Install', exact: true }).first().click();
  await done('Install OperatorHub.io catalog');
  await t.open('/c/minc/operators', P);
  await page.getByRole('region', { name: 'Prometheus Operator' }).waitFor();
  await t.shot('minc-operators-catalog');

  // ---------------------------------------------- OLM on ocp-dev
  await t.open('/c/ocp-dev/operators', P);
  await page.getByRole('region', { name: 'Crunchy Postgres for Kubernetes' }).getByRole('button', { name: 'Install' }).click();
  await confirmDialog('olm-install-dialog', 'Install');
  await done('Install Crunchy Postgres');
  await t.shot('olm-installed');

  // ------------------------------------- J4 laptop <-> cluster hybrid dev
  await t.open('/c/podman-machine-default/service-network', P);
  await page.getByRole('table').waitFor();
  await t.shot('skupper-not-linked');
  await page.getByRole('button', { name: 'Link to cluster' }).click();
  await done('Link podman-machine-default to ocp-dev');
  await t.shot('skupper-linked');
  const pg = await containerId('postgres');
  await t.open(`/c/podman-machine-default/containers/${pg}/summary`, P);
  await kebab('Expose to cluster');
  await confirmDialog('skupper-expose-dialog', 'Expose');
  await done('Expose postgres to ocp-dev');
  await t.open('/c/ocp-dev/service-network', P);
  await page.getByRole('table').waitFor();
  await t.shot('skupper-ocp-dev-listener');
  await t.open('/c/ocp-dev/k8s-pods', P);
  await page.getByRole('table').waitFor();
  await t.shot('ocp-dev-pods-crashloop');
  await t.open('/c/ocp-dev/kube/Pod~ledger~ledger-worker-6b9f7c5d8-q2x8z/summary', P);
  await page.getByRole('button', { name: 'Ask Lightspeed' }).click();
  await page.getByRole('textbox', { name: 'Lightspeed question' }).waitFor();
  await t.shot('lightspeed-attached');
  await page.getByRole('button', { name: 'Send' }).click();
  await page.getByRole('button', { name: /Update Secret ledger-db/ }).waitFor({ timeout: 20000 });
  await t.shot('lightspeed-answer');
  await page.getByRole('button', { name: /Update Secret ledger-db/ }).click();
  await done('Fix ledger-worker');
  await t.open('/c/ocp-dev/k8s-pods', P);
  await page.getByRole('table').waitFor();
  await t.shot('ocp-dev-pods-fixed');

  // ---------------------------------------------- J5 edge image as a VM
  const edge = await imageId('quay.io/acme/payments-edge', '9.6');
  await t.open(`/c/podman-machine-default/images/${edge}/summary`, P);
  await kebab('Run as VM on OpenShift');
  await confirmDialog('vm-run-dialog', 'Run as VM');
  await done('Run quay.io/acme/payments-edge:9.6 as VM');
  // stay in the app (timers drive Provisioning → Starting → Running)
  await page.getByRole('link', { name: 'ocp-dev' }).first().click();
  await page.getByRole('link', { name: 'Virtual machines' }).first().click();
  await page.getByRole('table').waitFor();
  await page.waitForTimeout(400);
  await t.shot('vms-starting');
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'payments-edge-test payments' }).click();
  await page.locator('a', { hasText: 'Console' }).first().click();
  await page.getByRole('log', { name: 'Serial console' }).waitFor({ timeout: 10000 });
  await t.shot('vm-console');
  await t.open('/c/ocp-dev', { ...P, tab: 'mcp' });
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.getByText(/Running on http:\/\/localhost/).waitFor();
  await t.shot('mcp-running');

  // ------------------------------------- supporting: CLI pack, account, local
  await t.open('/settings/openshift-cli', P);
  await page.getByRole('button', { name: /Install recommended/ }).click();
  await page.waitForTimeout(800);
  await t.shot('cli-pack-installing');
  await t.open('/settings/cli-tools', P);
  await t.shot('cli-tools');
  await t.open('/accounts', P);
  await t.shot('accounts');
  await t.open('/settings/redhat-account', P);
  await t.shot('redhat-account-settings');
  await t.open('/settings/registries', P);
  await t.shot('registries');
  await t.open('/c/openshift-local', { ...P, tab: 'crc' });
  await t.shot('openshift-local-console-users');
  await t.open('/c/dev-sandbox', { ...P, tab: 'sandbox' });
  await t.shot('sandbox');
  await t.open('/settings/create/openshift-local', P);
  await t.shot('openshift-local-create');
  await t.open('/tools/quay', P);
  await page.getByRole('table').waitFor();
  await t.shot('quay-tool');
}
