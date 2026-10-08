// RHEL customer journeys (docs/research/_rhel-scenario.md):
// R4 RHEL Podman machine · hardened rebase · compliance loop · fleet health · bootc to edge.
export const scenario = 'rhel';

/** @param {Awaited<ReturnType<typeof import('../lib.mjs').launch>>} t */
export async function journey(t) {
  const { page } = t;
  const content = page.getByRole('region', { name: 'Tab Content' });
  const pick = async (id, label) => {
    await page.locator(`#${id}`).click();
    await page.getByRole('button', { name: label, exact: true }).click();
  };

  /* ---- 1. Create RHEL Podman machine (R4) --------------------------- */
  await t.open('/', { speed: '5' });
  await t.shot('dashboard');
  await t.open('/settings/resources', { speed: '5' });
  await page.getByRole('region', { name: 'podman', exact: true }).waitFor();
  await t.shot('resources-podman-card');
  await page.getByRole('button', { name: 'Create RHEL Podman machine' }).click();
  await page.locator('#field-provider').waitFor();
  await pick('field-provider', 'Hyper-V (Windows)');
  await page.getByRole('alert', { name: /provider hyperv is not supported/ }).waitFor();
  await t.shot('r4-hyperv-error');
  await page.getByRole('button', { name: 'Switch to WSL' }).click();
  await page.getByRole('alert').first().waitFor({ state: 'detached' });
  await t.shot('r4-form-wsl');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await page.waitForTimeout(1200);
  await t.shot('r4-progress');
  await content.getByRole('button', { name: 'Open rhel-10' }).waitFor({ timeout: 20000 });
  await content.getByRole('button', { name: 'Open rhel-10' }).click();
  await page.getByRole('link', { name: 'rhel-10' }).first().waitFor();
  await t.shot('r4-rhel-10-engine');
  await page.getByRole('link', { name: 'Overview' }).first().click().catch(() => undefined);
  await page.waitForTimeout(500);
  await page.getByRole('link', { name: 'Subscription' }).first().click();
  await page.getByRole('region', { name: 'Subscription status' }).waitFor();
  await t.shot('r4-rhel-10-subscription');

  /* ---- 2. Noisy CVEs → hardened rebase ------------------------------ */
  await t.open('/c/podman-machine-default/images', { speed: '5' });
  await page.getByText('quay.io/acme/orders-api', { exact: true }).first().click();
  await page.locator('a', { hasText: 'Security' }).first().click();
  await page.getByRole('button', { name: 'Rebuild on hardened image' }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(1500);
  await t.shot('security-orders-api');
  await page.getByRole('region', { name: 'Red Hat Security Data (VEX)' }).scrollIntoViewIfNeeded();
  await t.shot('security-orders-api-vex');
  await page.getByRole('button', { name: 'Rebuild on hardened image' }).click();
  await page.waitForTimeout(3000);
  await t.shot('hardened-rebuild-task');

  /* ---- 3. Compliance loop ------------------------------------------- */
  await page.getByRole('button', { name: 'Generate remediation' }).scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Generate remediation' }).click();
  await page.waitForTimeout(2500);
  await t.open('/c/podman-machine-default/containers', { speed: '5' });
  await page.getByRole('textbox', { name: 'Search' }).first().fill('orders').catch(() => undefined);
  await page.getByText('orders-api-hb').first().waitFor();
  await t.shot('containers-side-by-side');
  await t.open('/tools/image-builder?tab=blueprints&bp=rhel10-cis-guest', { speed: '5' });
  await page.getByRole('region', { name: 'Blueprint rhel10-cis-guest' }).waitFor();
  await t.shot('image-builder-blueprint');
  await page.getByRole('link', { name: 'Images' }).last().click();
  await page.getByRole('button', { name: 'Create RHEL VM from this image' }).first().waitFor({ timeout: 15000 });
  await t.shot('image-builder-images');
  await page.getByRole('button', { name: 'Create RHEL VM from this image' }).first().click();
  await page.locator('#field-provider').waitFor();
  await t.shot('rhel-vm-form-prefilled');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await content.getByRole('button', { name: 'Open rhel10-cis' }).waitFor({ timeout: 20000 });

  /* ---- 4. Registered-fleet health ----------------------------------- */
  await t.open('/c/rhel10-dev?tab=advisor', { speed: '5' });
  await page.getByRole('button', { name: 'Fix in terminal' }).waitFor();
  await t.shot('advisor-rhel10-dev');
  await page.getByRole('button', { name: 'Fix in terminal' }).click();
  await page.getByText('Remediated · pending check-in').waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: 'Re-check' }).click();
  await page.waitForTimeout(1800);
  await t.shot('advisor-after-recheck');
  await page.locator('a', { hasText: 'Vulnerabilities' }).first().click();
  await page.getByRole('table', { name: 'CVEs' }).waitFor();
  await t.shot('vulnerabilities-rhel10-dev');
  await page.locator('a', { hasText: 'Advisor' }).first().click();
  await page.getByRole('button', { name: 'Explain with RHEL Lightspeed' }).first().click();
  await page.getByRole('log', { name: 'Messages' }).waitFor();
  await page.waitForTimeout(3500);
  await t.shot('rhel-lightspeed-chat');
  await t.open('/c/rhel9-db?tab=advisor', { speed: '5' });
  await page.getByRole('button', { name: 'Register rhel9-db' }).click();
  await page.getByRole('button', { name: 'Start and register' }).click();
  await page.waitForTimeout(2500);
  await t.shot('rhel9-db-registered');
  await page.locator('a', { hasText: 'Terminal' }).first().click();
  const input = page.getByRole('textbox', { name: 'Terminal input' });
  await input.fill('sudo subscription-manager status');
  await input.press('Enter');
  await t.shot('rhel9-db-terminal');
  await t.open('/settings/rhel-registration', { speed: '5' });
  await page.getByRole('region', { name: 'Activation keys' }).waitFor();
  await t.shot('settings-rhel-registration');

  /* ---- 5. bootc → edge device --------------------------------------- */
  await t.open('/c/podman-machine-default/bootc', { speed: '5' });
  await page.getByRole('button', { name: 'Build disk image' }).click();
  await page.getByRole('region', { name: 'Build disk image' }).waitFor();
  await t.shot('bootc-lint-blocked');
  await pick('bootc-image', 'quay.io/acme/edge-kiosk:1.1');
  await page.getByRole('region', { name: 'Build disk image' }).getByRole('button', { name: 'Build', exact: true }).click();
  await page.getByRole('button', { name: 'Boot in RHEL VM' }).first().waitFor();
  await page.waitForTimeout(2200);
  await t.shot('bootc-disk-images');
  await page.getByRole('button', { name: 'Boot in RHEL VM' }).first().click();
  await page.waitForTimeout(1500);
  await t.open('/c/edge-manager/enrollment-requests', { speed: '5' });
  await page.getByRole('button', { name: 'Approve' }).first().waitFor();
  await t.shot('edge-enrollment-requests');
  await page.getByRole('button', { name: 'Approve' }).first().click();
  await page.locator('a', { hasText: 'Fleets' }).first().click();
  await page.getByRole('region', { name: 'Fleet kiosks' }).waitFor();
  await page.getByRole('region', { name: 'Fleet kiosks' }).getByRole('button', { name: 'Roll out' }).click();
  await page.waitForTimeout(1200);
  await t.shot('edge-fleet-rollout');
  await page.locator('a', { hasText: 'Devices' }).first().click();
  await page.waitForTimeout(3500);
  await t.shot('edge-devices');

  await page.keyboard.press('Control+k');
  await page.getByRole('textbox', { name: 'Command palette command input' }).fill('RHEL');
  await t.shot('palette-rhel');
  await page.keyboard.press('Escape');
}
