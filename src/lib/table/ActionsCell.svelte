<script lang="ts">
// PD container/ContainerActions.svelte layout: inline icon buttons + kebab DropdownMenu
import { DropdownMenu } from '@podman-desktop/ui-svelte';

import Contribution from '#lib/components/Contribution.svelte';
import ListItemButtonIcon from '#lib/components/ListItemButtonIcon.svelte';

import type { ActionsCellData } from './types.ts';

interface Props {
  object: ActionsCellData;
}

let { object }: Props = $props();
const visibleMenu = $derived(object.menu.filter(m => !m.hidden));
</script>

<div class="flex items-center justify-end">
  {#each object.buttons as b (b.title)}
    {#if b.ext}
      <Contribution ext={b.ext} kind="menu (row)" api="P14">
        <ListItemButtonIcon title={b.title} icon={b.icon} onClick={b.onClick} hidden={b.hidden} enabled={b.enabled} inProgress={b.inProgress} detailed={object.detailed} />
      </Contribution>
    {:else}
      <ListItemButtonIcon title={b.title} icon={b.icon} onClick={b.onClick} hidden={b.hidden} enabled={b.enabled} inProgress={b.inProgress} detailed={object.detailed} />
    {/if}
  {/each}
  {#if visibleMenu.length}
    <DropdownMenu shownAsMenuActionItem={object.detailed}>
      {#each visibleMenu as m (m.title)}
        {#if m.ext}
          <Contribution ext={m.ext} kind="menu (kebab)" api="P14">
            <ListItemButtonIcon title={m.title} icon={m.icon} onClick={m.onClick} enabled={m.enabled} menu={true} />
          </Contribution>
        {:else}
          <ListItemButtonIcon title={m.title} icon={m.icon} onClick={m.onClick} enabled={m.enabled} menu={true} />
        {/if}
      {/each}
    </DropdownMenu>
  {/if}
</div>
