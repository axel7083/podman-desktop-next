// Automation journey (docs/research/_automation-scenario.md): Ansible projects → navigator run →
// replay → ADT shell; EE builder → EE badge; Export as Ansible on pod orders; EDA rulebook events;
// AAP acme-prod jobs / launch / MCP tab.
export const scenario = 'automation';

/** @param {Awaited<ReturnType<typeof import('../lib.mjs').launch>>} t */
export async function journey(t) {
  const { page } = t;

  // 1. Scaffold → run in EE → replay
  await t.open('/tools/ansible', { speed: '5' });
  await page.getByRole('region', { name: 'ADT workspace' }).waitFor();
  await page.getByRole('table', { name: 'ansible projects' }).waitFor();
  await t.shot('ansible-projects');

  await page.getByRole('button', { name: 'New project' }).click();
  await page.getByRole('textbox', { name: 'Project name' }).fill('acme.kiosk');
  await page.getByRole('region', { name: 'New project' }).getByRole('button', { name: 'Create' }).click();
  await page.getByRole('region', { name: 'New project' }).getByRole('button', { name: 'Close' }).waitFor({ timeout: 15000 });
  await t.shot('ansible-new-project');

  await page.getByRole('button', { name: 'Runs', exact: true }).click();
  await page.getByRole('table', { name: 'ansible runs' }).waitFor();
  await t.shot('ansible-runs');

  await page.getByRole('button', { name: 'Run playbook' }).click();
  await page.getByRole('dialog', { name: 'Run playbook' }).waitFor();
  await t.shot('ansible-run-dialog');
  await page.getByRole('dialog', { name: 'Run playbook' }).getByRole('button', { name: 'Run', exact: true }).click();
  await page.getByRole('table', { name: /^Tasks of / }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(400);
  await t.shot('ansible-run-live');
  await page.getByRole('region', { name: 'Play recap' }).waitFor({ timeout: 20000 });
  await t.shot('ansible-run-recap');

  await t.open('/tools/ansible', { tab: 'runs', run: 'site-artifact-2026-10-08T09:41:12.json', speed: '5' });
  await page.getByRole('region', { name: 'Failed tasks' }).waitFor();
  await t.shot('ansible-replay-failed');
  await page.getByRole('button', { name: 'Open in ADT shell' }).click();
  const input = page.getByRole('textbox', { name: 'Terminal input' });
  await input.waitFor();
  await input.fill('ansible-navigator --version');
  await input.press('Enter');
  await t.shot('adt-shell');

  // 2. Form-based EE build → EE badge in images
  await t.open('/tools/ansible', { tab: 'environments', new: '1', speed: '5' });
  await page.getByRole('region', { name: 'New execution environment' }).waitFor();
  await t.shot('ee-form');
  const eeForm = page.getByRole('region', { name: 'New execution environment' });
  await eeForm.getByRole('button', { name: 'Build', exact: true }).click();
  await eeForm.getByRole('button', { name: 'Open images' }).waitFor({ timeout: 20000 });
  await t.shot('ee-built');
  await eeForm.getByRole('button', { name: 'Use as navigator default' }).click();
  await eeForm.getByRole('button', { name: 'Open images' }).click();
  await page.getByRole('table').waitFor();
  await t.shot('images-ee-badges');

  // containers list: EDA activation + ansible run groups (P10)
  await t.open('/c/podman-machine-default/containers');
  await page.getByRole('table', { name: 'container' }).waitFor();
  await t.shot('containers-ansible-groups');

  // 3. Export as Ansible on pod orders
  await t.open('/c/podman-machine-default/pods');
  await page.getByRole('row', { name: 'orders', exact: true }).getByRole('button', { name: 'kebab menu' }).click();
  await page.getByText('Export as Ansible…').click();
  const exportDialog = page.getByRole('dialog', { name: 'Export pod orders as Ansible' });
  await exportDialog.waitFor();
  await t.shot('export-pod-quadlet');
  await exportDialog.getByRole('radio', { name: /System role/ }).click();
  await t.shot('export-pod-system-role');
  await exportDialog.getByRole('button', { name: 'Save to project' }).click();
  await exportDialog.getByRole('button', { name: 'Cancel' }).click();

  // 4. Event-driven self-heal
  await t.open('/tools/ansible', { tab: 'rulebooks', speed: '5' });
  await page.getByRole('region', { name: 'Event log' }).waitFor();
  await page.getByRole('button', { name: 'Simulate: make orders-db unhealthy' }).click();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Simulate: orders-api died' }).click();
  await page.getByRole('link', { name: 'AAP job 4821' }).waitFor({ timeout: 10000 });
  await t.shot('eda-events');

  // 5. AAP from the desktop + agent
  await t.open('/c/aap-acme-prod/aap-jobs', { speed: '5' });
  await page.getByRole('table', { name: 'aap jobs' }).waitFor();
  await t.shot('aap-jobs');
  await page.getByRole('button', { name: /^4821 — Remediate orders/ }).click();
  await page.getByRole('region', { name: 'Failed host events' }).waitFor();
  await t.shot('aap-job-4821');

  await t.open('/c/aap-acme-prod/aap-templates', { speed: '5' });
  await page.getByRole('table', { name: 'aap job templates' }).waitFor();
  await t.shot('aap-templates');
  await page.getByRole('button', { name: 'Launch Deploy orders (podman)' }).click();
  await page.getByRole('dialog', { name: 'Launch Deploy orders (podman)' }).waitFor();
  await t.shot('aap-launch-dialog');
  await page.getByRole('dialog', { name: 'Launch Deploy orders (podman)' }).getByRole('button', { name: 'Launch', exact: true }).click();
  await page.getByRole('log', { name: 'Job output' }).waitFor();
  await page.waitForTimeout(1200);
  await t.shot('aap-job-running');

  await t.open('/c/aap-acme-prod', { tab: 'aap-mcp', speed: '5' });
  await page.getByRole('button', { name: 'Register in MCP registry' }).click();
  await page.getByText('Registered', { exact: true }).waitFor({ timeout: 5000 });
  await t.shot('aap-mcp');

  await t.open('/');
  await t.shot('dashboard');
}
