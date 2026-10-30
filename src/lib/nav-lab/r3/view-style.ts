/**
 * P13 Views: the icons and colours a view can pick. Outline icons only, to sit
 * with the tree; colours are real `--pd-*` tokens. `auto` follows the query: a
 * view of one resource type wears that type's icon, a mixed view a bookmark.
 */
import {
  faBell,
  faBookmark,
  faCircleCheck,
  faClock,
  faCompass,
  faEye,
  faFolder,
  faHeart,
  faStar,
} from '@fortawesome/free-regular-svg-icons';
import { faLayerGroup } from '@fortawesome/free-solid-svg-icons';
import { ContainerIcon } from '@podman-desktop/ui-svelte/icons';

import type { IconRef } from '#lib/ext/types.ts';
import DeploymentIcon from '#lib/images/DeploymentIcon.svelte';
import ImageIcon from '#lib/images/ImageIcon.svelte';
import NetworkIcon from '#lib/images/NetworkIcon.svelte';
import PodIcon from '#lib/images/PodIcon.svelte';
import ServiceIcon from '#lib/images/ServiceIcon.svelte';
import VolumeIcon from '#lib/images/VolumeIcon.svelte';

import { parseQuery } from './query/parse.ts';

export const AUTO_ICON = 'auto';

/** Keyed by the `is:` value they stand for. */
export const RESOURCE_ICONS: Record<string, IconRef> = {
  container: ContainerIcon,
  pod: PodIcon,
  image: ImageIcon,
  volume: VolumeIcon,
  network: NetworkIcon,
  compose: faLayerGroup,
  deployment: DeploymentIcon,
  service: ServiceIcon,
};

export const GENERAL_ICONS: Record<string, IconRef> = {
  bookmark: faBookmark,
  star: faStar,
  heart: faHeart,
  bell: faBell,
  eye: faEye,
  folder: faFolder,
  clock: faClock,
  compass: faCompass,
  check: faCircleCheck,
};

/** `default` keeps the surrounding text colour. */
export const VIEW_COLORS: Record<string, { label: string; token?: string }> = {
  default: { label: 'Default' },
  purple: { label: 'Purple', token: '--pd-badge-purple' },
  sky: { label: 'Blue', token: '--pd-badge-sky' },
  fuchsia: { label: 'Pink', token: '--pd-badge-fuchsia' },
  green: { label: 'Green', token: '--pd-status-running' },
  amber: { label: 'Amber', token: '--pd-status-degraded' },
  red: { label: 'Red', token: '--pd-status-dead' },
};

/** The icon of a query that targets a single resource type, if it does. */
function autoIcon(query: string): IconRef {
  const types = parseQuery(query).filter(t => t.key === 'is' && !t.negated && t.value);
  const only = types.length === 1 ? RESOURCE_ICONS[types[0].value.toLowerCase()] : undefined;
  return only ?? faBookmark;
}

export function iconOf(key: string | undefined, query: string): IconRef {
  if (!key || key === AUTO_ICON) return autoIcon(query);
  return RESOURCE_ICONS[key] ?? GENERAL_ICONS[key] ?? autoIcon(query);
}

export function colorOf(key: string | undefined): string | undefined {
  const token = VIEW_COLORS[key ?? 'default']?.token;
  return token ? `var(${token})` : undefined;
}
