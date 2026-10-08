// Platform engineer journey (docs/research/_platform-scenario.md):
// RHADS pack → payments-api supply chain → orders-api release-ready (SBOM, preflight, sign & push, policy)
// → Konflux failed run → re-run → release → ledger-worker blocked deploy → TPA / zot / trivy.
export const scenario = 'platform';

/** @param {Awaited<ReturnType<typeof import('../lib.mjs').launch>>} t */
export async function journey(t) {
  const { page } = t;
  const speed = { speed: '5' };

  /** Open an image (by repository) on podman-machine-default and switch to a tab via URL. */
  async function openImage(repo, tab) {
    await t.open('/c/podman-machine-default/images', speed);
    await page.getByRole('button', { name: new RegExp(`^${repo.replace(/[/.]/g, '\\$&')}`) }).first().click();
    await page.waitForURL(/\/images\/[^/]+\/summary/);
    if (tab) {
      const url = page.url().replace(/\/summary(\?|$)/, `/${tab}$1`);
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(300);
    }
  }

  await t.open('/', speed);
  await t.shot('dashboard-posture');

  await t.open('/extensions', speed);
  await page.getByRole('region', { name: 'redhat.rhads-pack' }).first().waitFor();
  await page.getByRole('region', { name: 'redhat.rhads-pack' }).first().scrollIntoViewIfNeeded();
  await t.shot('extensions-rhads-pack');

  await t.open('/c/podman-machine-default/images', speed);
  await t.shot('images-badges');

  // J1 – image supply-chain card
  await openImage('quay.io/acme/payments-api', 'supply-chain');
  await page.getByRole('region', { name: 'Supply chain summary' }).waitFor();
  await t.shot('payments-supply-chain');
  await page.getByRole('button', { name: 'Rekor entry 48190021' }).click();
  await t.shot('payments-rekor-proof');
  await page.getByRole('button', { name: 'Rebuild on ubi9 9.8' }).click();
  await page.getByRole('button', { name: 'Validate again' }).first().waitFor();
  await page.waitForTimeout(1800);
  await page.getByRole('button', { name: 'Validate again' }).first().click();
  await page.waitForTimeout(1200);
  await t.shot('payments-policy-passed');

  await openImage('quay.io/acme/payments-api', 'security');
  await page.waitForTimeout(1200);
  await t.shot('payments-security-checkers');

  // J2 – make a local image release-ready
  await openImage('quay.io/acme/orders-api', 'sbom');
  await page.getByRole('button', { name: 'Generate SBOM' }).click();
  await page.getByRole('button', { name: 'Upload to TPA' }).waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: 'Upload to TPA' }).click();
  await page.getByRole('table', { name: 'Vulnerabilities' }).waitFor({ timeout: 10000 });
  await t.shot('orders-sbom-vex');

  // J3 – certification readiness
  await openImage('quay.io/acme/orders-api', 'supply-chain');
  await page.getByRole('button', { name: 'Run certification checks' }).click();
  await page.getByRole('list', { name: 'Preflight checks' }).waitFor({ timeout: 10000 });
  await t.shot('orders-preflight-6-of-8');
  await page.getByRole('button', { name: 'Apply suggested Containerfile fix' }).click();
  await page.getByRole('button', { name: 'Submit to Partner Connect' }).waitFor({ timeout: 10000 });
  await t.shot('orders-preflight-8-of-8');

  // sign & push, then policy re-run
  await page.getByRole('button', { name: 'Sign & push…' }).click();
  await page.getByRole('dialog').or(page.locator('[aria-label="Sign and push image"]')).first().waitFor();
  await t.shot('orders-sign-push-dialog');
  await page.getByRole('button', { name: 'Push and sign' }).click();
  await page.waitForTimeout(2200);
  await page.getByRole('button', { name: /Validate release policy|Validate again/ }).first().click();
  await page.waitForTimeout(1500);
  await page.getByRole('region', { name: 'Release policy' }).scrollIntoViewIfNeeded();
  await t.shot('orders-signed-policy');
  await openImage('quay.io/acme/orders-api', 'policy');
  await t.shot('orders-policy-tab');

  // J4 – Konflux failure to release
  await t.open('/c/konflux-acme/konflux-applications', speed);
  await page.getByRole('region', { name: 'Konflux applications' }).waitFor();
  await t.shot('konflux-applications');
  await page.getByRole('link', { name: 'PipelineRuns' }).first().click();
  await page.getByRole('region', { name: 'PipelineRun details' }).waitFor();
  await page.getByRole('button', { name: /View logs/ }).click();
  await t.shot('konflux-failed-run-logs');
  await page.getByRole('button', { name: 'Push fix and re-run' }).click();
  await page.waitForTimeout(900);
  await t.shot('konflux-rerun-running');
  await page.waitForTimeout(4500);
  await page.getByRole('link', { name: 'Releases' }).first().click();
  await page.waitForTimeout(400);
  await t.shot('konflux-releases');

  // J5 – verify before you run
  await openImage('quay.io/acme/ledger-worker', 'supply-chain');
  await page.getByRole('region', { name: 'Deploy gate' }).scrollIntoViewIfNeeded();
  await t.shot('ledger-deploy-blocked');
  await page.getByRole('button', { name: 'Override…' }).click();
  await page.getByRole('textbox', { name: 'Audit note' }).fill('Hotfix approved by release manager (INC-4821)');
  await page.getByRole('region', { name: 'Deploy gate' }).scrollIntoViewIfNeeded();
  await t.shot('ledger-override');

  await t.open('/tools/tpa', speed);
  await t.shot('tpa-purl-search');

  await t.open('/c/local-registry/repositories', speed);
  await t.shot('zot-repositories');

  await t.open('/settings/cli-tools', speed);
  await t.shot('cli-tools');
}
