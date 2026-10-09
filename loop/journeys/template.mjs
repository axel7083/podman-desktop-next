// Template journey: enables src/extensions/_template (?template=on) and visits
// every place a contribution renders – a smoke test of the contribution model.
export const scenario = 'community';

/** @param {Awaited<ReturnType<typeof import('../lib.mjs').launch>>} t */
export async function journey(t) {
  const { page } = t;
  await t.open('/extensions', { template: 'on', inspect: 'on' });
  await page.getByRole('button', { name: /Catalog/ }).click();
  await page.getByRole('region', { name: 'example.template' }).getByRole('button', { name: 'Install' }).click();
  await page.waitForTimeout(300);
  await t.shot('installed-template');

  await page.getByRole('link', { name: 'kind-dev' }).first().click();
  await page.getByRole('link', { name: 'Example items' }).click();
  await page.getByRole('table').waitFor();
  await t.shot('nav-section');

  await t.open('/c/kind-dev', { tab: 'addons', template: 'on', inspect: 'on' });
  await page.getByRole('button', { name: 'Install' }).first().click();
  // add-ons with a `confirm` text ask first
  const confirm = page.getByRole('dialog').getByRole('button', { name: 'Install', exact: true });
  if (await confirm.isVisible().catch(() => false)) await confirm.click();
  await t.shot('addons');

  // TOOLS is capped (docs/ia.md scaling rules): the tool may sit in "More"
  const toolLink = page.getByRole('link', { name: 'Example tool' }).first();
  if (await toolLink.isVisible()) await toolLink.click();
  else {
    await page.getByRole('button', { name: 'More Tools' }).click();
    await page.getByRole('menuitem', { name: 'Example tool' }).click();
  }
  await t.shot('tool');

  await page.getByRole('link', { name: 'podman-machine-default' }).first().click();
  await page.getByRole('link', { name: 'Images' }).first().click();
  await page.getByRole('button', { name: 'ubi9/httpd-24' }).first().click();
  await page.locator('a', { hasText: 'Security' }).first().click();
  await page.waitForTimeout(1200);
  await t.shot('image-security');

  await page.getByRole('link', { name: 'Dashboard' }).first().click();
  await t.shot('dashboard');
  await page.getByRole('link', { name: 'Accounts' }).first().click();
  await t.shot('accounts');
  await page.getByRole('link', { name: 'Settings' }).first().click();
  await page.getByRole('link', { name: 'CLI Tools' }).click();
  await t.shot('cli-tools');
}
