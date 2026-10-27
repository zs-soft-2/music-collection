import { ContributionEntity, TrackEntity } from '@music-collection/api';

import { CreditCategory, creditCategory } from '../../shared/music-ui';
import { parseTrackRefs } from '../album/album.mapper';

export interface TrackCredit {
	/** Null for writers added by hand. */
	musicianUid: string | null;
	name: string;
	roles: string[];
	category: CreditCategory;
}

/**
 * Credits of one track: the credits limited to it, the album-wide
 * songwriting credits, and the writers added by hand. One entry per person.
 */
export function toTrackCredits(
	track: TrackEntity,
	tracks: TrackEntity[],
	contributions: ContributionEntity[]
): TrackCredit[] {
	const positions = tracks.map((item) => item.position ?? '');
	const people = new Map<string, TrackCredit>();

	for (const contribution of contributions) {
		const category = creditCategory(contribution.role);
		const onTrack = contribution.tracks
			? parseTrackRefs(contribution.tracks, positions).has(
					track.position ?? ''
				)
			: category === 'songwriting';
		if (!onTrack) {
			continue;
		}
		const role = contribution.roleDetail
			? `${contribution.role} (${contribution.roleDetail})`
			: contribution.role;
		const person = people.get(contribution.musicianUid) ?? {
			musicianUid: contribution.musicianUid,
			name: contribution.name,
			roles: [],
			category,
		};
		if (!person.roles.includes(role)) {
			person.roles.push(role);
		}
		if (category === 'songwriting') {
			person.category = category;
		}
		people.set(contribution.musicianUid, person);
	}

	const known = new Set(
		Array.from(people.values()).map((person) => person.name.toLowerCase())
	);
	for (const writer of track.writers ?? []) {
		if (writer.trim() && !known.has(writer.trim().toLowerCase())) {
			people.set(`writer:${writer}`, {
				musicianUid: null,
				name: writer.trim(),
				roles: ['Written-By'],
				category: 'songwriting',
			});
		}
	}

	// Songwriters first.
	return Array.from(people.values()).sort(
		(a, b) =>
			Number(b.category === 'songwriting') -
			Number(a.category === 'songwriting')
	);
}
