<script lang="ts">
import { EmptyScreen } from '@podman-desktop/ui-svelte';
import { page } from '$app/state';

import Contribution from '#lib/components/Contribution.svelte';
import LazyComponent from '#lib/components/LazyComponent.svelte';
import { registry } from '#lib/ext/registry.svelte.ts';
import { CORE_RESOURCES, KUBE_KINDS } from '#lib/nav.ts';
import ConnectionStoppedScreen from '#lib/resources/ConnectionStoppedScreen.svelte';
import ContainerList from '#lib/resources/ContainerList.svelte';
import EngineResourceList from '#lib/resources/EngineResourceList.svelte';
import KubeResourceList from '#lib/resources/KubeResourceList.svelte';

const conn = $derived(registry.getConnection(page.params.conn ?? ''));
const resource = $derived(page.params.resource ?? '');
const section = $derived(conn && !conn.extensionDisabled ? registry.navSectionsFor(conn).find(s => s.id === resource) : undefined);
</script>

{#if !conn}
  <EmptyScreen title="Connection not found" message="'{page.params.conn}' does not exist in this scenario." />
{:else if conn.extensionDisabled}
  <ConnectionStoppedScreen {conn} kind={resource} />
{:else if resource === 'containers'}
  <ContainerList {conn} />
{:else if resource === 'pods' || resource === 'images' || resource === 'volumes' || resource === 'networks' || resource === 'secrets'}
  {#key resource + conn.id}
    <EngineResourceList {conn} {resource} />
  {/key}
{:else if KUBE_KINDS[resource]}
  {#key resource + conn.id}
    <KubeResourceList {conn} title={CORE_RESOURCES[resource].label} kinds={KUBE_KINDS[resource]} icon={CORE_RESOURCES[resource].icon as never} />
  {/key}
{:else if section}
  <Contribution ext={section.ext} kind="navSection page" api="P2" class="h-full">
    {#key section.id + conn.id}
      <LazyComponent component={section.component} props={{ conn }} />
    {/key}
  </Contribution>
{:else}
  <EmptyScreen title="Nothing here" message="'{resource}' is not available for {conn.name}. The extension providing it may be disabled." />
{/if}
