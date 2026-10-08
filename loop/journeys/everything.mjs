// Everything journey: every scenario at once (~75 extensions). Scaling stress
// test of the shell (docs/ia.md "Scaling rules"): nav caps and overflow,
// container groups, many contributions on one connection, ten image checkers,
// the extensions page, the palette, Settings › Resources, status popover, toasts.
export const scenario = 'everything';

/** @param {Awaited<ReturnType<typeof import('../lib.mjs').launch>>} t */
export async function journey(t) {
  const { page } = t;
  page.setDefaultTimeout(10000);

  // 1. Dashboard + expanded primary nav
  await t.open('/');
  await page.getByLabel('System Overview', { exact: true }).first().waitFor();
  await t.shot('dashboard');

  // 2. Primary nav: selecting an overflow tool swaps it in, footer stays visible
  await page.getByRole('button', { name: 'More Tools' }).click();
  await page.getByRole('menuitem', { name: 'Services catalog' }).click();
  await page.getByRole('link', { name: 'Services catalog' }).first().waitFor();
  await t.shot('nav-overflow-selected');

  // 3. Collapsed primary nav
  await page.getByRole('separator', { name: 'Resize navigation bar' }).dblclick();
  await page.waitForTimeout(200);
  await t.shot('nav-collapsed');
  await page.getByRole('separator', { name: 'Resize navigation bar' }).dblclick();

  // 4. Containers list with many groupers
  await t.open('/c/podman-machine-default/containers');
  await page.getByRole('table', { name: 'container' }).waitFor();
  await t.shot('containers-grouped');

  // 5. Engine overview with many contributions
  await t.open('/c/podman-machine-default');
  await page.getByRole('heading', { name: 'podman-machine-default' }).first().waitFor();
  await page.waitForTimeout(300);
  await t.shot('engine-overview');

  // 6. ocp-dev: connect through OCM (a task → toasts), then the secondary nav
  //    with many contributed sections (Pipelines, GitOps, VMs, Operators…)
  await t.open('/tools/openshift-cluster-manager', { speed: '5' });
  await page.getByRole('button', { name: 'Connect to ocp-dev' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Update and connect', exact: true }).click();
  await page.getByText(/oc login --web ocp-dev/).first().waitFor({ timeout: 20000 });
  await t.shot('toasts-task');
  await page.getByText(/oc login --web ocp-dev.*completed/).first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(500);
  await page.waitForTimeout(600);
  await t.open('/c/ocp-dev');
  await page.getByRole('link', { name: 'Virtual machines' }).first().waitFor();
  await t.shot('ocp-dev-overview');

  // 7. Image security tab with every checker
  await t.open('/c/podman-machine-default/images');
  await page.getByRole('table', { name: 'image' }).waitFor();
  await page.getByText('quay.io/acme/orders-api', { exact: true }).first().click();
  await page.locator('a', { hasText: 'Security' }).first().click();
  await page.getByLabel('Security summary').waitFor();
  await page.waitForTimeout(2500);
  await t.shot('image-security');

  // 8. Extensions page: unfiltered, then filtered
  await t.open('/extensions');
  await page.getByRole('region', { name: 'podman-desktop.podman' }).first().waitFor();
  await t.shot('extensions');
  await page.getByRole('textbox').first().fill('openshift');
  await page.waitForTimeout(300);
  await t.shot('extensions-filtered');

  // 9. Command palette
  await t.open('/');
  await page.keyboard.press('Control+k');
  await page.getByRole('dialog', { name: 'Command palette' }).waitFor();
  await t.shot('palette');
  await page.getByRole('textbox', { name: 'Command palette command input' }).fill('kafka');
  await page.waitForTimeout(200);
  await t.shot('palette-query');
  await page.keyboard.press('Escape');

  // 10. Settings › Resources
  await t.open('/settings/resources');
  await page.waitForTimeout(300);
  await t.shot('settings-resources');

  // 11. Status popover
  await t.open('/');
  await page.getByRole('button', { name: 'Connections status' }).click();
  await page.waitForTimeout(300);
  await t.shot('status-popover');
  await page.keyboard.press('Escape');

  // 12. Smaller window: 1280×800 keeps Extensions/Accounts/Settings visible
  await page.setViewportSize({ width: 1280, height: 800 });
  await t.open('/c/podman-machine-default/containers');
  await page.getByRole('table', { name: 'container' }).waitFor();
  await t.shot('containers-1280');

  // 13. Welcome scenario picker
  await t.open('/', { welcome: 'on' });
  await page.getByRole('link', { name: 'Show welcome' }).click().catch(() => undefined);
  await page.evaluate(() => localStorage.removeItem('pdn.scenarios'));
  await page.goto(page.url().replace(/scenario=[^&]*&?/, '').replace(/welcome=off&?/, ''));
  await page.getByRole('dialog', { name: 'Welcome' }).waitFor();
  await t.shot('welcome');
}
