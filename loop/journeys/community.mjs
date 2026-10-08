// Community journey: containers → details/logs → extensions toggle → status popover → palette.
export const scenario = 'community';

/** @param {Awaited<ReturnType<typeof import('../lib.mjs').launch>>} t */
export async function journey(t) {
  const { page } = t;
  await t.open('/');
  await t.shot('dashboard');

  await page.getByRole('link', { name: 'podman-machine-default' }).first().click();
  await page.getByRole('table', { name: 'container' }).waitFor();
  await t.shot('containers');

  await page.getByRole('button', { name: 'web-nginx' }).first().click();
  await page.getByRole('heading', { name: 'web-nginx' }).waitFor();
  await t.shot('container-summary');

  await page.locator('a', { hasText: 'Logs' }).first().click();
  await page.getByRole('log', { name: 'Logs' }).waitFor();
  await page.waitForTimeout(1500);
  await t.shot('container-logs');

  await page.locator('a', { hasText: 'Terminal' }).first().click();
  const input = page.getByRole('textbox', { name: 'Terminal input' });
  await input.fill('cat /etc/os-release');
  await input.press('Enter');
  await t.shot('container-terminal');

  await page.getByRole('link', { name: 'Images' }).first().click();
  await page.getByRole('table').waitFor();
  await t.shot('images');

  await page.getByRole('link', { name: 'kind-dev' }).first().click();
  await t.shot('kind-overview');
  await page.getByRole('link', { name: 'Deployments' }).first().click();
  await page.getByRole('table').waitFor();
  await t.shot('kind-deployments');

  await page.getByRole('link', { name: 'Extensions' }).first().click();
  await page.getByRole('region', { name: 'podman-desktop.compose' }).waitFor();
  await t.shot('extensions');
  // disable Compose → its grouper and CLI tool disappear
  await page.getByRole('checkbox', { name: 'Disable Compose' }).click({ force: true });
  await page.waitForTimeout(300);
  await t.shot('extensions-compose-disabled');
  await page.getByRole('checkbox', { name: 'Enable Compose' }).click({ force: true });

  await page.getByRole('link', { name: 'Settings' }).first().click();
  await page.getByRole('region', { name: 'Featured Provider Resources' }).waitFor();
  await t.shot('settings-resources');

  await page.getByRole('button', { name: 'Connections status' }).click();
  await t.shot('status-popover');
  await page.keyboard.press('Escape');

  await page.keyboard.press('Control+k');
  await page.getByRole('textbox', { name: 'Command palette command input' }).fill('nginx');
  await t.shot('palette');
  await page.keyboard.press('Escape');

  // inspect overlay pass
  await t.open('/c/podman-machine-default/containers', { inspect: 'on' });
  await t.shot('inspect-containers');
}
