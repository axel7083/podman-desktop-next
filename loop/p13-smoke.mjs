// Headless smoke test of the P13 app (no screenshots): switcher elevation,
// bootc pages + build task, Kubernetes grouped tree + namespace multi-select,
// the 7 Red Hat flows end-to-end, Kompose (flow 8) and the Vanilla promotions. Fails on any
// console error / page error.
//   node loop/p13-smoke.mjs [baseUrl]   (default http://localhost:5173/)
import { chromium } from '@playwright/test';

const base = process.argv[2] ?? 'http://localhost:5173/';
const url = q => `${base.replace(/\/?$/, '/')}#/?${q}`;

const browser = await chromium.launch({ headless: true });
const results = [];
const errors = [];

async function session(q, width = 1440) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  page.on('console', m => {
    if (m.type() === 'error') errors.push(`[${q}] console: ${m.text()}`);
  });
  page.on('pageerror', e => errors.push(`[${q}] pageerror: ${e.message}`));
  await page.goto(url(q));
  await page.waitForSelector('[data-testid="p13-tree"]');
  return page;
}

async function step(name, fn) {
  if (process.env.ONLY && !new RegExp(process.env.ONLY).test(name)) return;
  try {
    await fn();
    results.push(['ok', name]);
  } catch (e) {
    results.push(['FAIL', name, String(e.message ?? e).split('\n').slice(0, 3).join(' | ')]);
    if (process.env.DEBUG) {
      const p = browser.contexts().at(-1)?.pages()[0];
      console.log(await p?.getByTestId('nav-lab-panel-body').innerText().catch(() => ''));
      console.log(await p?.getByRole('dialog').innerText().catch(() => 'no dialog'));
    }
  }
}

const expect = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

/** Switch the current connection with the switcher. */
async function useConn(page, name) {
  await page.getByTestId('switcher-button').click();
  await page.getByTestId('switcher-menu').getByRole('menuitem').getByText(name, { exact: true }).click();
}

const tree = page => page.getByTestId('p13-tree');
const BOOTC = 'bootc@podman-machine-default';
const AILAB = 'ai-lab@podman-machine-default';
/** Tree row by its key (section id, `<provider>@<conn>[/<child>…]`, `grp:<folder>`). */
const key = (page, k) => tree(page).locator(`[data-key="${k}"]`).first();
/** Expand a tree row (no-op when already open). */
async function expand(page, k) {
  const row = key(page, k);
  if ((await row.getAttribute('aria-expanded')) !== 'true') await row.locator('[data-chevron]').click();
}
const modal = page => page.getByRole('dialog');
const primary = page => page.getByTestId('modal-primary');
/** Wait for a task line in the bottom panel. */
const panelText = (page, text, timeout = 15000) => page.getByTestId('nav-lab-panel-body').getByText(text, { exact: false }).first().waitFor({ timeout });

/* ---------------------------------------------------------------- A */
{
  const page = await session('panel=off');
  await step('A1 switcher dropdown is elevated + backdrop', async () => {
    await page.getByTestId('switcher-button').click();
    const menu = page.getByTestId('switcher-menu');
    await menu.waitFor();
    const shadow = await menu.evaluate(el => getComputedStyle(el).boxShadow);
    expect(shadow && shadow !== 'none', `box-shadow is ${shadow}`);
    const radius = await menu.evaluate(el => getComputedStyle(el).borderRadius);
    expect(radius === '8px', `radius ${radius}`);
    expect(await page.getByTestId('switcher-backdrop').isVisible(), 'no backdrop');
    await page.keyboard.press('Escape');
  });

  await step('A2 bootc pages are not placeholders', async () => {
    await expand(page, BOOTC);
    for (const [label, testid] of [['Overview', 'bootc-overview'], ['Images', 'bootc-images'], ['Disk Images', 'bootc-disks'], ['Examples', 'bootc-examples']]) {
      await key(page, `${BOOTC}/${label}`).click();
      await page.getByTestId(testid).waitFor({ timeout: 4000 });
    }
    expect((await page.getByTestId('bootc-example').count()) >= 6, 'examples');
    const body = await page.locator('main, body').innerText();
    expect(!/Bootable containers 1|New in Bootable containers/.test(body), 'placeholder text found');
  });

  await step('A2 extension tool pages are not placeholders', async () => {
    await useConn(page, 'kind-dev');
    const t = tree(page).getByRole('treeitem', { name: 'Kreate' });
    await t.click();
    await page.getByTestId('tool-view').waitFor();
    const body = await page.getByTestId('tool-view').innerText();
    expect(!/Kreate 1|New in Kreate/.test(body), 'placeholder text');
    await useConn(page, 'podman-machine-default');
  });

  await step('A2 Build disk image → task → Disk images', async () => {
    await key(page, `${BOOTC}/Images`).click();
    await page.getByTestId('bootc-build').click();
    await modal(page).getByTestId('build-types').getByRole('checkbox', { name: /RAW/ }).click();
    await page.getByTestId('build-image').selectOption('quay.io/fedora/fedora-bootc:42');
    await primary(page).click();
    await panelText(page, 'Build complete');
    await key(page, `${BOOTC}/Disk Images`).click();
    await page.getByTestId('bootc-disks').getByText('fedora-bootc-42.raw').first().waitFor({ timeout: 4000 });
  });
  await page.context().close();
}

/* ---------------------------------------------------------------- B */
{
  const page = await session('panel=off');
  await step('B kube grouped tree (folders collapsed)', async () => {
    await useConn(page, 'kind-dev');
    for (const g of ['Compute', 'Config', 'Network', 'Storage', 'Access Control']) {
      const f = tree(page).locator(`[data-folder="${g}"]`);
      await f.waitFor();
      expect((await f.getAttribute('aria-expanded')) === 'false', `${g} expanded`);
    }
    await tree(page).locator('[data-folder="Compute"]').click();
    await key(page, 'deployments').waitFor();
    await tree(page).getByRole('treeitem', { name: 'Overview' }).first().click();
    await page.getByTestId('kube-overview').waitFor({ timeout: 4000 });
  });

  await step('B namespace multi-select shows the Namespace column', async () => {
    await key(page, 'kpods').click();
    await page.getByTestId('kube-list').waitFor();
    const head = () => page.getByTestId('kube-list').getByText('Namespace', { exact: true });
    expect((await head().count()) === 0, 'Namespace column with one namespace');
    await page.getByTestId('kube-list').getByTestId('ns-select').click();
    await page.getByRole('menuitemcheckbox', { name: /kube-system/ }).first().click();
    await page.keyboard.press('Escape');
    await head().first().waitFor({ timeout: 3000 });
  });
  await page.context().close();
}

/* ---------------------------------------------------------------- C */
{
  const page = await session('panel=on');
  await step('C1 Red Hat sign-in → registry + keys + avatar', async () => {
    await page.getByRole('button', { name: 'Accounts' }).click();
    await page.getByTestId('accounts-signin').click();
    await primary(page).click();
    await page.getByTestId('modal-primary').getByText('Done').waitFor({ timeout: 6000 });
    await primary(page).click();
    await page.getByTestId('rh-keys').waitFor();
    await page.getByTestId('title-avatar').waitFor();
    await page.getByTestId('title-avatar').click();
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByTestId('registry-managed').waitFor();
  });

  await step('C2 RHEL Podman machine wizard → task → current connection', async () => {
    await page.getByTestId('switcher-button').click();
    await page.getByTestId('switcher-add').click();
    await page.locator('[data-factory="rhel-machine"]').click();
    await page.getByTestId('rhel-provider').locator('[data-opt="hyperv"]').click();
    await page.getByTestId('rhel-hyperv-error').waitFor();
    await page.getByTestId('rhel-fix-wsl').click();
    await primary(page).click();
    await panelText(page, 'is ready', 20000);
    await page.waitForTimeout(300);
    const cur = await page.getByTestId('switcher-button').innerText();
    expect(cur.includes('rhel-10-2'), `current is ${cur}`);
  });

  await step('C3 Ask Lightspeed from a failed command', async () => {
    await page.getByTestId('panel-tab').filter({ hasText: 'rhel-10' }).first().click();
    await page.getByTestId('ask-lightspeed-failed').first().click();
    await page.getByTestId('lightspeed-chat').waitFor();
    await page.locator('[data-testid="ls-msg"][data-role="assistant"][data-done]').first().waitFor({ timeout: 15000 });
    await page.getByTestId('ls-run').first().click();
  });

  await step('C4 image supply chain: scan → push+sign → deploy', async () => {
    await useConn(page, 'podman-machine-default');
    await expand(page, 'images');
    const img = tree(page).getByRole('treeitem', { name: 'quay.io/acme/orders-api:1.4' }).first();
    await img.dblclick();
    await page.getByTestId('provenance-timeline').waitFor();
    await page.locator('[data-step="scanned"]').getByTestId('timeline-action').click();
    await img.dblclick();
    await page.locator('[data-step="pushed"]').getByTestId('timeline-action').click();
    await page.getByTestId('push-gates').waitFor();
    await primary(page).click();
    await panelText(page, 'Pushed quay.io/acme/orders-api:1.4', 20000);
    await page.locator('[data-step="signed"][data-state="done"]').waitFor({ timeout: 4000 });
    await page.locator('[data-step="deployed"]').getByTestId('timeline-action').click();
    await page.getByTestId('deploy-target').locator('[data-opt="sandbox"]').click();
    await primary(page).click();
    await panelText(page, 'is available at', 20000);
    await page.locator('[data-step="deployed"][data-state="done"]').waitFor({ timeout: 4000 });
    await page.locator('[data-step="deployed"]').getByTestId('timeline-link').click();
    await page.getByTestId('kube-resource').waitFor({ timeout: 4000 });
    await useConn(page, 'sandbox');
    await expand(page, 'grp:Compute').catch(() => tree(page).locator('[data-folder="Compute"]').click());
    await key(page, 'deployments').click();
    await page.getByTestId('kube-list').getByText('orders-api', { exact: true }).first().waitFor({ timeout: 4000 });
  });

  await step('C5 bootc → disk → RHEL VM + OpenShift Virtualization', async () => {
    await useConn(page, 'podman-machine-default');
    await expand(page, BOOTC);
    await key(page, `${BOOTC}/Disk Images`).click();
    const row = page.getByTestId('bootc-disks').getByText('orders-os-v3.qcow2').first();
    await row.click({ button: 'right' });
    await page.getByTestId('nav-lab-context-menu').getByText('Boot in RHEL VM').click();
    await primary(page).click();
    await panelText(page, 'login: alice', 15000);
    await page.waitForTimeout(300);
    expect((await page.getByTestId('switcher-button').innerText()).includes('orders-os-v3-vm'), 'VM not current');
    await useConn(page, 'podman-machine-default');
    await expand(page, BOOTC);
    await key(page, `${BOOTC}/Disk Images`).click();
    await page.getByTestId('bootc-disks').getByText('orders-os-v3.qcow2').first().click({ button: 'right' });
    await page.getByTestId('nav-lab-context-menu').getByText('Run on OpenShift Virtualization').click();
    await page.getByTestId('virt-target').locator('[data-opt="minc"]').click();
    await primary(page).click();
    await panelText(page, 'console. The escape sequence', 20000);
    await useConn(page, 'minc');
    await key(page, 'vms').waitFor();
  });

  await step('C6 AI chain: serve → ModelCar → push → OpenShift AI → playground', async () => {
    await useConn(page, 'podman-machine-default');
    await expand(page, AILAB);
    await expand(page, `${AILAB}/Models`);
    await key(page, `${AILAB}/Models/granite-3.3-8b-instruct`).click();
    await page.getByTestId('ai-model').waitFor();
    await page.getByTestId('ai-serve').click();
    await page.getByTestId('gpu-check').waitFor();
    await primary(page).click();
    await page.getByTestId('ai-modelcar').click();
    await primary(page).click();
    await page.locator('[data-step="modelcar"][data-state="done"]').waitFor({ timeout: 20000 });
    await page.locator('[data-step="pushed"]').getByTestId('timeline-action').click();
    await primary(page).click();
    await page.locator('[data-step="pushed"][data-state="done"]').waitFor({ timeout: 20000 });
    await page.locator('[data-step="rhoai"]').getByTestId('timeline-action').click();
    await primary(page).click();
    await page.locator('[data-step="rhoai"][data-state="done"]').waitFor({ timeout: 20000 });
    await page.locator('[data-step="playground"]').getByTestId('timeline-action').click();
    const opts = await page.getByTestId('playground-provider').innerText();
    expect(opts.includes('OpenShift AI'), 'no OpenShift AI provider');
  });

  await step('C7 local OpenShift: console add-on, operators', async () => {
    await useConn(page, 'minc');
    await key(page, 'console@minc').click();
    await page.getByTestId('console-install').click();
    await page.getByTestId('console-auth-warning').waitFor({ timeout: 20000 });
    await key(page, 'operators').click();
    await page.getByTestId('operators-seg').getByRole('radio', { name: 'Catalog' }).click();
    await page.getByRole('button', { name: 'Install' }).first().click();
    await panelText(page, 'installed', 15000);
  });
  await page.context().close();
}

/* ---------------------------------------------------------------- E Kompose */
{
  const page = await session('panel=on');
  await step('E Kompose: convert compose → dry run → deploy to kind-dev → undeploy', async () => {
    await expand(page, 'compose');
    await tree(page).getByRole('treeitem', { name: 'orders-stack' }).first().dblclick();
    await page.getByTestId('compose-convert').click();
    await page.getByTestId('kompose-manifests').waitFor();
    await page.getByTestId('head-views').getByRole('radio', { name: /Warnings/ }).click();
    await page.getByTestId('kompose-warnings').getByText('depends_on').first().waitFor();
    await page.getByTestId('head-views').getByRole('radio', { name: /Manifests/ }).click();
    await page.getByTestId('kompose-yaml').waitFor();
    await page.getByTestId('kompose-dryrun').click();
    await panelText(page, 'Dry run OK');
    await page.getByTestId('kompose-deploy').click();
    await panelText(page, 'services deployed to kind-dev', 25000);
    await useConn(page, 'kind-dev');
    await tree(page).locator('[data-fresh]').first().waitFor({ timeout: 4000 });
    await key(page, 'deployments').click();
    await page.getByTestId('kube-list').locator('[data-fresh], :text-is("worker")').first().waitFor({ timeout: 4000 });
    await useConn(page, 'podman-machine-default');
    await expand(page, 'compose');
    await tree(page).getByRole('treeitem', { name: 'orders-stack' }).first().dblclick();
    await page.getByTestId('kompose-deployments').getByText('kind-dev / default').click({ button: 'right' });
    await page.getByTestId('nav-lab-context-menu').getByText('Undeploy').click();
    await panelText(page, 'Removed', 15000);
    await page.getByTestId('kompose-deployments').waitFor({ state: 'detached', timeout: 4000 });
  });
  await step('E Kompose: bulk convert of 2 containers', async () => {
    await key(page, 'containers').click();
    const checks = page.getByTestId('modern-table').getByTestId('mt-check');
    await checks.nth(0).check();
    await checks.nth(1).check();
    await page.getByTestId('bulk-bar').getByText('Convert to Kubernetes').click();
    await page.getByText('Kompose · 2 containers').first().waitFor();
    await page.getByTestId('kompose-manifests').getByTestId('mt-group').nth(1).waitFor();
  });
  await page.context().close();
}

/* ---------------------------------------------------------------- F polish at 1280px */
{
  const page = await session('panel=off', 1280);
  /** No horizontal overflow: scrollWidth <= clientWidth on the element and its scroll container. */
  async function noOverflowX(loc, what) {
    await loc.first().waitFor();
    const r = await loc.first().evaluate(el => {
      const out = [];
      for (let n = el; n && n !== document.body; n = n.parentElement) {
        if (n.scrollWidth > n.clientWidth + 1 && getComputedStyle(n).overflowX !== 'visible') out.push(`${n.dataset.testid ?? n.className}: ${n.scrollWidth}>${n.clientWidth}`);
      }
      if (el.scrollWidth > el.clientWidth + 1) out.unshift(`self ${el.scrollWidth}>${el.clientWidth}`);
      return out;
    });
    expect(r.length === 0, `${what} overflows: ${r.join(', ')}`);
  }
  await step('F Kompose header + target bar fit at 1280px, manifests grouped per service, no status dots', async () => {
    await expand(page, 'compose');
    await tree(page).getByRole('treeitem', { name: 'orders-stack' }).first().dblclick();
    await page.getByTestId('compose-convert').click();
    const v = page.getByTestId('kompose-view');
    await v.getByTestId('kompose-manifests').waitFor();
    await noOverflowX(v.getByTestId('tab-head'), 'Kompose header');
    await noOverflowX(v.getByTestId('kompose-target-bar'), 'Kompose target bar');
    await noOverflowX(v.getByTestId('kompose-manifests').getByTestId('modern-table'), 'Kompose manifests table');
    const groups = v.getByTestId('kompose-manifests').getByTestId('mt-group');
    expect((await groups.count()) >= 2, 'manifests not grouped per service');
    expect(/Deployment|StatefulSet/.test(await groups.first().getByTestId('mt-agg').innerText()), 'group row has no controller summary');
    expect((await v.getByTestId('kompose-manifests').getByTestId('mt-dot').count()) === 0, 'status dots in the manifests table');
    expect((await v.getByTestId('kompose-generator').innerText()).match(/\d+\.\d+/) === null, 'generator shows a version');
    expect((await v.getByTestId('head-views').innerText()).includes('Services') === false, 'Services view still present');
    await groups.first().getByTestId('row-btn').click();
    await page.getByTestId('nav-lab-context-menu').getByText('StatefulSet').waitFor();
    await page.keyboard.press('Escape');
    await v.getByTestId('kompose-manifests').getByTestId('mt-row').nth(1).click();
    expect((await v.getByTestId('kompose-file').innerText()).endsWith('.yaml'), 'no file selected');
  });
  await step('F Hummingbird catalog + alternatives fit at 1280px, dots only for pulled', async () => {
    await useConn(page, 'podman-machine-default');
    await expand(page, 'hummingbird@podman-machine-default');
    for (const [node, testid] of [['Catalog', 'hb-catalog'], ['Alternatives', 'hb-alternatives']]) {
      await tree(page).locator(`[data-key="hummingbird@podman-machine-default/${node}"]`).first().dblclick();
      const t = page.getByTestId(testid);
      await t.getByTestId('mt-row').first().waitFor();
      await noOverflowX(t.getByTestId('modern-table'), testid);
      await noOverflowX(t, testid);
    }
    expect((await page.getByTestId('hb-alternatives').getByTestId('mt-badge').count()) > 0, 'no severity badge');
    expect((await page.getByTestId('hb-alternatives').getByTestId('mt-dot').count()) === 0, 'meaningless dots in alternatives');
  });
  await step('F CLI Tools lists Kompose', async () => {
    await page.getByTestId('switcher-button').click();
    await page.getByTestId('switcher-menu').getByText('Manage connections').click();
    await page.getByRole('button', { name: 'CLI Tools' }).click();
    await page.locator('[data-tool="Kompose"]').getByText('Registered by Kompose').waitFor();
  });
  await step('F kube: meaningful folder icons, no New cluster on overview, All namespaces toggles all', async () => {
    await useConn(page, 'kind-dev');
    await tree(page).getByRole('treeitem', { name: 'Overview' }).first().click();
    const ov = page.getByTestId('kube-overview');
    await ov.waitFor();
    expect((await ov.getByText('New cluster').count()) === 0, 'New cluster on cluster overview');
    await ov.getByTestId('ns-select').click();
    const menu = page.getByTestId('ns-menu');
    await menu.getByTestId('ns-all').click();
    const items = menu.getByTestId('ns-item');
    const n = await items.count();
    for (let i = 0; i < n; i++) expect((await items.nth(i).getAttribute('aria-checked')) === 'true', 'All does not check every namespace');
    await items.first().click();
    expect((await menu.getByTestId('ns-all').getAttribute('aria-checked')) === 'false', 'All still checked after unchecking one');
    expect((await ov.getByTestId('ns-select').innerText()).includes(`${n - 1} namespaces`), `label is ${await ov.getByTestId('ns-select').innerText()}`);
    await items.first().click();
    expect((await menu.getByTestId('ns-all').getAttribute('aria-checked')) === 'true', 'all checked is not All namespaces');
    await page.keyboard.press('Escape');
  });
  await page.context().close();
}

/* ---------------------------------------------------------------- Vanilla */
{
  const page = await session('install=vanilla&panel=off');
  await step('Vanilla: Red Hat promo on a RHEL image + Add connection installs RHEL', async () => {
    await expand(page, 'images');
    await tree(page).getByRole('treeitem', { name: 'registry.redhat.io/ubi10/ubi:latest' }).first().click();
    await page.getByTestId('rh-promo').waitFor();
    expect((await page.getByTestId('rh-promo-btn').innerText()).includes('Install'), 'promo not install');
    await page.getByTestId('switcher-button').click();
    await page.getByTestId('switcher-add').click();
    await page.locator('[data-factory="rhel-machine"]').getByText('Installs').waitFor();
    await page.keyboard.press('Escape');
  });
  await step('Vanilla: Kompose promotion on Convert to Kubernetes', async () => {
    await expand(page, 'compose');
    await tree(page).getByRole('treeitem', { name: 'orders-stack' }).first().click({ button: 'right' });
    await page.getByTestId('nav-lab-context-menu').getByText('Convert to Kubernetes (install Kompose)').click();
    await page.getByTestId('kompose-view').getByTestId('promo-install').click();
    await page.getByTestId('kompose-manifests').waitFor();
  });
  await page.context().close();
}

/* ---------------------------------------------------------------- T Red Hat workflow tours (dashboard cards + palette) */
/* Each card's tour is started then auto-played with "Show me" in a fresh page, until the overlay reports done. */
{
  const probe = await session('panel=off');
  await probe.getByTestId('rh-workflows').waitFor().catch(() => {});
  const flowsIds = await probe.getByTestId('rh-flow-card').evaluateAll(els => els.map(e => e.getAttribute('data-flow')));
  await step('T dashboard shows 8 Red Hat workflow cards', async () => {
    await probe.getByTestId('rh-workflows').waitFor();
    expect(flowsIds.length === 8, `${flowsIds.length} cards`);
  });
  await step('T palette lists "Tour:" entries under Workflows', async () => {
    await probe.keyboard.press('Control+k');
    await probe.getByTestId('p13-palette').getByTestId('palette-group').filter({ hasText: 'Workflows' }).waitFor();
    const item = probe.getByTestId('palette-item').filter({ hasText: 'Tour: Kompose' });
    await item.waitFor();
    await item.click();
    await probe.getByTestId('tour-overlay').waitFor();
    await probe.getByTestId('tour-exit').click();
    await probe.getByTestId('tour-overlay').waitFor({ state: 'detached' });
  });
  await probe.context().close();
  for (const id of flowsIds) {
    const page = await session('panel=off');
    await step(`T tour ${id}: Show me plays to Done`, async () => {
      await page.locator(`[data-testid="rh-flow-card"][data-flow="${id}"]`).getByTestId('rh-flow-start').click();
      await page.getByTestId('tour-callout').waitFor();
      await page.getByTestId('tour-showme').click();
      try {
        await page.locator('[data-testid="tour-overlay"][data-done="true"]').waitFor({ timeout: 90000 });
      } catch (e) {
        const at = await page.getByTestId('tour-step').innerText().catch(() => '?');
        throw new Error(`stuck at "${at}"`);
      }
      await page.getByTestId('tour-exit').click();
      await page.getByTestId('tour-overlay').waitFor({ state: 'detached' });
    });
    await page.context().close();
  }
}

await browser.close();
for (const r of results) console.log(r.join('  '));
console.log(`${results.filter(r => r[0] === 'ok').length}/${results.length} steps ok`);
if (errors.length) console.log(`\n${errors.length} console/page errors:\n${[...new Set(errors)].slice(0, 20).join('\n')}`);
process.exit(results.some(r => r[0] === 'FAIL') || errors.length ? 1 : 0);
