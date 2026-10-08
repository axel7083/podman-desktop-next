<script lang="ts">
/** AI Lab API server (Ollama-compatible) on port 10434. */
import { NavPage } from '@podman-desktop/ui-svelte';

import { CATALOG } from '../../data.ts';
import { ai } from '../../shared.ts';
import Card from '../ui/Card.svelte';
import Chip from '../ui/Chip.svelte';
import CodeBlock from '../ui/CodeBlock.svelte';

const models = $derived(CATALOG.filter(m => ai().downloaded.includes(m.id)));
</script>

<NavPage title="Local Server" searchEnabled={false}>
  {#snippet content()}
    <div class="flex flex-col gap-4 px-5 py-4 w-full overflow-auto">
      <Card title="Server">
        <div class="flex items-center gap-2"><Chip label="Running" tone="success" /> <span class="font-mono">http://localhost:10434</span> <Chip label="Ollama-compatible API" /> <Chip label="OpenAPI /api-docs" /></div>
      </Card>
      <Card title="Models available through the API">
        <ul class="list-disc pl-5">
          {#each models as m (m.id)}<li class="font-mono text-xs py-0.5">{m.name}</li>{/each}
        </ul>
      </Card>
      <CodeBlock label="List models" code={'curl http://localhost:10434/api/tags\n\ncurl http://localhost:10434/api/chat -d \'{\n  "model": "ibm-granite/granite-3.3-8b-instruct-GGUF",\n  "messages": [{ "role": "user", "content": "Hello" }]\n}\''} />
    </div>
  {/snippet}
</NavPage>
