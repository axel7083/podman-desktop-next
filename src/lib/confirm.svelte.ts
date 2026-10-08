/**
 * In-app confirmation dialog (PD copy rules: "Delete container?" title,
 * "Are you sure you want to delete container X?", Cancel = link button).
 */
export interface ConfirmRequest {
  title: string;
  message: string;
  buttonLabel: string;
  variant?: 'danger' | 'primary';
  resolve: (ok: boolean) => void;
}

export const confirmState: { current: ConfirmRequest | undefined } = $state({ current: undefined });

export function confirm(options: Omit<ConfirmRequest, 'resolve'>): Promise<boolean> {
  return new Promise(resolve => {
    confirmState.current = { ...options, resolve };
  });
}

/** `withConfirmation(fn, 'delete container x', 'Delete container?')` like PD's messagebox-utils. */
export function withConfirmation(action: () => void, text: string, title: string, buttonLabel = 'Delete'): void {
  confirm({ title, message: `Are you sure you want to ${text}?`, buttonLabel, variant: 'danger' })
    .then(ok => {
      if (ok) action();
    })
    .catch(console.error);
}
