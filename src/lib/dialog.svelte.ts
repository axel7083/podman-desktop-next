/**
 * Generic modal host for extension-contributed dialogs (menus that open a
 * form/preview without leaving the page, e.g. "Export as Ansible…").
 * The component receives its props plus `onclose`.
 */
import type { Component } from 'svelte';

export interface DialogRequest {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: Component<any>;
  props: Record<string, unknown>;
}

export const dialogState: { current: DialogRequest | undefined } = $state({ current: undefined });

export function openDialog<P extends Record<string, unknown>>(component: Component<P & { onclose: () => void }>, props: P): void {
  dialogState.current = { component, props };
}

export function closeDialog(): void {
  dialogState.current = undefined;
}
