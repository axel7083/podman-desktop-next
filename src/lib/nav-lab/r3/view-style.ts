/** P13 Views: the icons and colours a view can pick. Colours are real `--pd-*` tokens. */
import {
  faBolt,
  faBookmark,
  faBug,
  faCube,
  faCubes,
  faDatabase,
  faFire,
  faFlask,
  faGear,
  faGlobe,
  faHeart,
  faLayerGroup,
  faRocket,
  faServer,
  faShieldHalved,
  faStar,
  faTag,
  faTerminal,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';

export const VIEW_ICONS: Record<string, IconDefinition> = {
  bookmark: faBookmark,
  star: faStar,
  rocket: faRocket,
  'layer-group': faLayerGroup,
  cube: faCube,
  cubes: faCubes,
  server: faServer,
  database: faDatabase,
  globe: faGlobe,
  terminal: faTerminal,
  gear: faGear,
  tag: faTag,
  flask: faFlask,
  bug: faBug,
  shield: faShieldHalved,
  bolt: faBolt,
  fire: faFire,
  heart: faHeart,
};

export const DEFAULT_ICON = 'bookmark';

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

export function iconOf(key: string | undefined): IconDefinition {
  return VIEW_ICONS[key ?? DEFAULT_ICON] ?? VIEW_ICONS[DEFAULT_ICON];
}

export function colorOf(key: string | undefined): string | undefined {
  const token = VIEW_COLORS[key ?? 'default']?.token;
  return token ? `var(${token})` : undefined;
}
