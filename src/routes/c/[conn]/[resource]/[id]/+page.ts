import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';

import type { PageLoad } from './$types';

// Details default to the first tab.
export const load: PageLoad = ({ params }) => {
  redirect(307, resolve('/c/[conn]/[resource]/[id]/[tab]', { ...params, tab: 'summary' }));
};
