// Windows journey (docs/research/_windows-scenario.md): three engines in one nav,
// honest WSLC capabilities, move a workload to Podman, Docker context hygiene,
// Apple container parity; then a community part for Helm and k3d.
export const scenario = 'windows';

/** @param {Awaited<ReturnType<typeof import('../lib.mjs').launch>>} t */
export async function journey(t) {
  const { page } = t;

  // 1. Three engines, one nav + WSL Containers dashboard card
  await t.open('/');
  await page.getByLabel('WSL Containers').first().waitFor();
  await t.shot('dashboard');

  // 2. WSLC default: containers/images/volumes/networks only (no Pods)
  await page.getByRole('button', { name: 'Navigate to WSLC default' }).first().click();
  await page.getByRole('table', { name: 'container' }).waitFor();
  await t.shot('wslc-containers');

  await t.open('/c/wslc-default', { tab: 'capabilities' });
  await page.getByRole('table', { name: 'Engine capabilities' }).waitFor();
  await t.shot('wslc-capabilities');

  // 3. Move a workload: web → Recreate on Podman → task → container on podman-machine-default
  await t.open('/c/wslc-default/containers', { speed: '5' });
  await page.getByRole('button', { name: /^web\b/ }).first().click();
  await page.getByRole('heading', { name: 'web' }).first().waitFor();
  await page.getByRole('button', { name: 'kebab menu' }).first().click();
  await page.getByText('Recreate on Podman').first().click();
  const dialog = page.getByRole('dialog', { name: 'Recreate web on Podman' });
  await dialog.waitFor();
  await t.shot('recreate-dialog');
  await dialog.getByRole('button', { name: 'Recreate', exact: true }).click();
  await page.waitForTimeout(400);
  await t.shot('recreate-task');
  await page.waitForTimeout(1500);
  await t.open('/c/podman-machine-default/containers');
  await page.getByRole('table', { name: 'container' }).waitFor();
  await t.shot('podman-containers-with-web');

  // 5. Context hygiene: Settings › Docker contexts (skipped + remote rows) → make podman-machine-default current
  await t.open('/settings/docker-contexts');
  await page.getByRole('table', { name: 'Docker contexts' }).waitFor();
  await t.shot('docker-contexts');
  await page.getByRole('button', { name: 'Create context for podman-machine-default' }).click();
  await page.waitForTimeout(300);
  await t.shot('docker-contexts-podman-current');

  await t.open('/c/docker-prod-ssh', { tab: 'docker-context' });
  await page.getByRole('note', { name: 'Remote context' }).waitFor();
  await t.shot('prod-ssh-context');

  await t.open('/c/docker-desktop', { tab: 'docker-context' });
  await page.getByRole('button', { name: 'Make current Docker context' }).first().waitFor();
  await t.shot('desktop-linux-context');

  // Cross-platform reference: install Apple container from the catalog
  await t.open('/extensions', { tab: 'catalog' });
  const apple = page.getByRole('region', { name: 'redhat.apple-container' });
  await apple.waitFor();
  await t.shot('catalog-apple');
  await apple.getByRole('button', { name: 'Install' }).click();
  await page.waitForTimeout(300);
  // stay in-app: t.open() with ?scenario= would reset the enabled extensions to the preset
  await page.getByRole('link', { name: 'Dashboard' }).first().click();
  await page.getByRole('button', { name: 'Navigate to Apple' }).first().click();
  await page.locator('a', { hasText: 'Prerequisites' }).first().click();
  await page.getByRole('button', { name: 'Start container system' }).waitFor();
  await t.shot('apple-prerequisites');
  await page.getByRole('button', { name: 'Start container system' }).click();
  await page.getByRole('status', { name: 'container system status' }).getByText('is running').waitFor({ timeout: 10000 });
  await page.locator('a', { hasText: 'Capabilities' }).first().click();
  await page.getByRole('table', { name: 'Engine capabilities' }).waitFor();
  await t.shot('apple-capabilities');

  // ---- Community part: Helm + k3d ----
  await t.open('/c/kind-dev/helm-releases', { scenario: 'community', speed: '5' });
  await page.getByRole('table', { name: 'helm-releases' }).waitFor();
  await t.shot('helm-releases');

  await page.getByRole('button', { name: /^orders\b/ }).first().click();
  await page.getByRole('heading', { name: 'orders' }).first().waitFor();
  await t.shot('helm-release-orders');
  await page.getByRole('alert').getByRole('button', { name: 'Rollback to revision 3' }).click();
  await page.waitForTimeout(1200);
  await t.shot('helm-release-rolled-back');

  await t.open('/tools/helm-charts', { scenario: 'community', speed: '5' });
  await page.getByRole('list', { name: 'Charts' }).waitFor();
  await page.getByRole('textbox').first().fill('valkey');
  await page.waitForTimeout(300);
  await t.shot('helm-charts-valkey');
  await page.getByRole('button', { name: 'Install bitnami/valkey' }).click();
  const install = page.getByRole('dialog', { name: 'Install valkey' });
  await install.waitFor();
  await t.shot('helm-install-dialog');
  await install.getByRole('button', { name: 'Install', exact: true }).click();
  await page.waitForTimeout(1500);
  await t.open('/c/kind-dev/helm-releases', { scenario: 'community' });
  await page.getByRole('table', { name: 'helm-releases' }).waitFor();
  await t.shot('helm-releases-after-install');

  await t.open('/settings/create/k3d-cluster', { scenario: 'community', speed: '5' });
  await page.getByRole('textbox', { name: 'Cluster name' }).waitFor();
  await t.shot('k3d-create-form');

  await t.open('/c/k3d-dev', { scenario: 'community' });
  await page.getByRole('heading', { name: 'k3d-dev' }).first().waitFor();
  await t.shot('k3d-dev-overview');

  await t.open('/c/podman-machine-default/containers', { scenario: 'community' });
  await page.getByRole('table', { name: 'container' }).waitFor();
  await t.shot('k3d-node-containers');
}
