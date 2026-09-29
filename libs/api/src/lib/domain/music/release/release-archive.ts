import { Release } from './release';

/**
 * Whether the pressing was archived. Written as a test for `false` rather
 * than for truthiness: every release saved before the field existed has no
 * `active` at all, and those are the catalog as it stands — offered.
 */
export function isReleaseArchived(release: Pick<Release, 'active'>): boolean {
	return release.active === false;
}
