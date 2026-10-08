// AI developer journeys (docs/research/_ai-scenario.md):
// 1 serve a GPU-fitting RedHatAI model with vLLM, 2 ModelCar to OpenShift AI,
// 3 OpenShift AI under the cluster, 4 MaaS quota + Kaiden workspace, 5 MCP for every client.
export const scenario = 'ai';

/** @param {Awaited<ReturnType<typeof import('../lib.mjs').launch>>} t */
export async function journey(t) {
  const { page } = t;
  const fast = { speed: '5' };
  const row = name => page.getByRole('row', { name });
  const waitTask = async text => {
    await page.getByText(text).first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(500);
  };

  await t.open('/', fast);
  await t.shot('dashboard');

  /* 1. Pick a model that fits my GPU, serve it with vLLM ------------------- */
  await t.open('/tools/ai-lab', fast);
  await t.shot('ai-lab-dashboard');
  await page.getByRole('link', { name: 'Catalog', exact: true }).click();
  await page.getByRole('tab', { name: /RedHatAI/ }).click();
  await page.getByRole('checkbox', { name: /Fits my GPU/ }).click({ force: true });
  await row('RedHatAI/granite-3.1-8b-instruct-quantized.w4a16').waitFor();
  await t.shot('catalog-redhatai-fits');
  await row('RedHatAI/granite-3.1-8b-instruct-quantized.w4a16').getByRole('button', { name: 'Serve with Red Hat AI Inference' }).click();
  await page.getByRole('button', { name: 'Create service' }).waitFor();
  await t.shot('create-vllm-service');
  await page.getByRole('button', { name: 'Create service' }).click();
  await page.waitForTimeout(700);
  await t.shot('create-vllm-progress');
  await page.getByRole('button', { name: 'Open service details' }).first().waitFor({ timeout: 20000 });
  await page.getByRole('button', { name: 'Open service details' }).first().click();
  await page.getByLabel('OpenAI endpoint').waitFor();
  await t.shot('vllm-service-details');
  await page.getByRole('button', { name: 'Open in playground' }).click();
  await page.getByRole('button', { name: 'Send prompt' }).click();
  await page.waitForTimeout(2500);
  await t.shot('vllm-playground');
  await page.getByRole('link', { name: 'vLLM @ localhost:8000' }).first().click();
  await page.waitForTimeout(300);
  await t.shot('vllm-connection');

  /* 2. Laptop to cluster with ModelCar ------------------------------------- */
  await t.open('/tools/ai-lab', { ...fast, p: 'catalog' });
  await page.getByRole('tab', { name: /RedHatAI/ }).click();
  await row('RedHatAI/granite-3.1-8b-instruct-quantized.w4a16').getByRole('button', { name: 'kebab menu' }).click();
  await page.getByTitle('Package as ModelCar').click();
  await page.getByRole('button', { name: 'Build ModelCar' }).waitFor();
  await t.shot('package-modelcar');
  await page.getByRole('button', { name: 'Build ModelCar' }).click();
  await waitTask('Building ModelCar quay.io/acme-ai/modelcar-granite-3.1-8b-instruct-w4a16:1.0 completed');
  await page.getByRole('link', { name: 'podman-machine-default' }).first().click();
  await page.getByRole('link', { name: 'Images' }).first().click();
  await row(/modelcar-granite-3.1-8b-instruct-w4a16/).waitFor();
  await t.shot('images-modelcar-badge');
  await row(/modelcar-granite-3.1-8b-instruct-w4a16/).getByRole('button', { name: /modelcar-granite-3.1-8b/ }).first().click();
  await page.locator('a', { hasText: 'ModelCar' }).first().click();
  await page.getByRole('button', { name: 'Push to quay.io' }).click();
  await waitTask('Pushing quay.io/acme-ai/modelcar-granite-3.1-8b-instruct-w4a16:1.0 completed');
  await page.getByRole('button', { name: 'Register in model registry' }).click();
  await waitTask('Registering acme-granite v1.0 completed');
  await t.shot('modelcar-tab-pushed');
  await page.getByRole('button', { name: 'Deploy to OpenShift AI' }).click();
  await page.getByRole('button', { name: 'Apply' }).waitFor();
  await t.shot('deploy-isvc-yaml');
  await page.getByRole('button', { name: 'Apply' }).click();
  await page.getByRole('link', { name: 'rhoai-dev' }).first().click();
  await page.getByRole('link', { name: 'Model serving' }).click();
  await page.waitForTimeout(400);
  await t.shot('rhoai-serving-loading');
  await waitTask('Deploying InferenceService');
  await page.waitForTimeout(4000);
  await t.shot('rhoai-serving-ready');

  /* 3. OpenShift AI under my cluster --------------------------------------- */
  await t.open('/c/rhoai-dev/rhoai-overview', fast);
  await page.getByText('default-dsc').first().waitFor();
  await t.shot('rhoai-overview');
  await page.getByRole('link', { name: 'Workbenches' }).click();
  await row('acme-rag-notebook').getByRole('button', { name: 'Start workbench' }).click();
  await t.shot('rhoai-workbenches');
  await page.getByRole('link', { name: 'Model serving' }).click();
  await row('granite-8b').getByRole('button', { name: 'granite-8b' }).first().click();
  await page.locator('a', { hasText: 'Endpoint' }).first().click();
  await page.getByLabel('Inference URL').waitFor();
  await t.shot('isvc-endpoint');
  await page.getByRole('button', { name: 'Try in playground' }).click();
  await page.getByRole('button', { name: 'Send prompt' }).waitFor({ timeout: 15000 });
  await page.getByRole('button', { name: 'Send prompt' }).click();
  await page.waitForTimeout(2500);
  await t.shot('rhoai-playground');
  await page.getByRole('link', { name: 'rhoai-dev' }).first().click();
  await page.getByRole('link', { name: 'Model registry' }).click();
  await t.shot('rhoai-registry');

  /* 4. Governed company models and agents ---------------------------------- */
  await t.open('/c/maas-rhoai-dev/maas-models', fast);
  await t.shot('maas-models');
  await page.getByRole('link', { name: 'API keys' }).click();
  await page.getByRole('button', { name: 'Create API key' }).click();
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await page.getByRole('button', { name: 'Done' }).waitFor({ timeout: 10000 });
  await t.shot('maas-key-created');
  await page.getByRole('button', { name: 'Done' }).click();
  await t.open('/tools/ai-lab', { ...fast, p: 'playgrounds', new: 'granite-3-3-8b-instruct', provider: 'conn:maas-rhoai-dev' });
  await page.getByRole('button', { name: 'Create playground' }).click();
  const prompt = page.getByRole('textbox', { name: 'Prompt' });
  for (const q of ['What does the SmartHub 3 warranty cover?', 'How do I return an item?', 'How do I reset my password?', 'Can I pair two hubs?']) {
    await prompt.fill(q);
    await page.getByRole('button', { name: 'Send prompt' }).click();
    await page.waitForTimeout(2200);
  }
  await t.shot('maas-quota-429');
  await page.getByRole('alert').getByRole('button', { name: 'Switch to local AI Lab model' }).last().click();
  await page.waitForTimeout(600);
  await t.shot('maas-switched-local');
  await t.open('/c/openshell-gateway/kaiden-workspaces', fast);
  await page.getByRole('button', { name: 'Start agent workspace' }).click();
  await t.shot('kaiden-start');
  await page.getByRole('button', { name: 'Start workspace' }).click();
  await waitTask('Creating agent workspace acme-support-cc-2 completed');
  await t.shot('kaiden-workspaces');
  await t.open('/c/podman-machine-default/containers', fast);
  await page.getByRole('table', { name: 'container' }).waitFor();
  await t.shot('containers-grouped');

  /* 5. One-click MCP for every client -------------------------------------- */
  await t.open('/tools/mcp', { ...fast, tab: 'registry' });
  await page.getByRole('textbox', { name: /search/ }).fill('kubernetes');
  await t.shot('mcp-registry-search');
  await page.getByRole('button', { name: 'Install Kubernetes MCP Server' }).click();
  await t.shot('mcp-install');
  await page.getByRole('button', { name: 'Install', exact: true }).click();
  await page.getByLabel('MCP server tools').waitFor({ timeout: 20000 });
  await t.shot('mcp-server-tools');
  await page.getByRole('button', { name: 'Add to client' }).click();
  await t.shot('mcp-add-to-claude');
  await page.getByRole('tab', { name: 'VS Code' }).click();
  await t.shot('mcp-add-to-vscode');
  await page.getByRole('button', { name: 'Add to VS Code' }).click();
  await page.getByRole('button', { name: 'Deploy to rhoai-dev' }).click();
  await waitTask('Applying MCPServer kubernetes-mcp completed');
  await t.open('/c/rhoai-dev/rhoai-mcp', fast);
  await t.shot('rhoai-mcpserver');
  await t.open('/tools/mcp', { ...fast, tab: 'clients' });
  await t.shot('mcp-clients');
}
