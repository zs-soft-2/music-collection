/**
 * Pure helpers of the Discogs import: matching catalog albums to Discogs
 * masters, trimming Discogs payloads, and turning a release into Track,
 * Musician and Contribution documents.
 */

/** "Testament (2)" → "Testament" (Discogs disambiguation suffix). */
export function stripDiscogsSuffix(name) {
	return String(name ?? '')
		.replace(/\s*\(\d+\)\s*$/, '')
		.trim();
}

/** Lower-case, accent-free, punctuation-free form for comparisons. */
export function normalize(text) {
	return stripDiscogsSuffix(text)
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/&/g, ' and ')
		.replace(/^the\s+/, '')
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
}

/**
 * Year of a Firestore REST value: epoch milliseconds (integer), a timestamp or
 * an ISO string. Dates are stored as local midnight (e.g. 1987-01-01T00:00+01),
 * which is still the previous year in UTC, so half a day is added.
 */
export function yearOf(value) {
	const raw =
		value?.integerValue ??
		value?.doubleValue ??
		value?.timestampValue ??
		value?.stringValue ??
		null;
	if (raw === null || raw === '') {
		return null;
	}
	const ms = /^-?\d+(\.\d+)?$/.test(String(raw))
		? Number(raw)
		: Date.parse(raw);
	if (Number.isNaN(ms)) {
		return null;
	}
	return new Date(ms + 12 * 60 * 60 * 1000).getUTCFullYear();
}

const VIDEO_FORMATS = [
	'DVD',
	'DVD-Video',
	'VHS',
	'Blu-ray',
	'Betamax',
	'Laserdisc',
];

/**
 * How well a Discogs format list fits the catalog album type (lp, ep, live,
 * compilation, single): studio albums beat singles, videos and bootlegs that
 * share the title.
 */
export function formatScore(albumFormat, formats) {
	const has = (name) => formats.includes(name);
	const type = String(albumFormat ?? '').toLowerCase();
	let score = 0;

	if (has('Unofficial Release')) score -= 3;
	if (formats.some((format) => VIDEO_FORMATS.includes(format))) score -= 3;

	if (type === 'single') {
		if (has('Single')) score += 2;
	} else if (type === 'ep' || type === 'maxi') {
		if (has('EP')) score += 2;
		if (has('Single')) score -= 1;
	} else {
		if (has('Album')) score += 2;
		if (has('Single') || has('7"')) score -= 2;
		if (has('Compilation')) score += type === 'compilation' ? 1 : -1;
	}
	return score;
}

/**
 * Scores Discogs search results against an album. A result is a candidate
 * only when both the artist and the title match after normalization.
 */
export function rankCandidates(album, results) {
	const artist = normalize(album.artistName);
	const title = normalize(album.name);

	return results
		.map((result) => {
			const separator = result.title.indexOf(' - ');
			const resultArtist = normalize(
				separator >= 0 ? result.title.slice(0, separator) : ''
			);
			const resultTitle = normalize(
				separator >= 0
					? result.title.slice(separator + 3)
					: result.title
			);
			const resultYear = Number(result.year) || null;

			const artistMatch = resultArtist === artist;
			const titleMatch = resultTitle === title;
			let score = formatScore(album.format, result.format ?? []);
			if (artistMatch) score += 2;
			if (titleMatch) score += 2;
			if (album.year && resultYear) {
				const diff = Math.abs(album.year - resultYear);
				if (diff === 0) score += 1;
				else if (diff === 1) score += 0.5;
			}

			return {
				id: result.id,
				type: result.type,
				title: result.title,
				year: resultYear,
				score,
				eligible: artistMatch && titleMatch,
			};
		})
		.filter((candidate) => candidate.eligible)
		.sort(
			(a, b) => b.score - a.score || (a.year ?? 9999) - (b.year ?? 9999)
		);
}

/** Keeps only the release fields the import uses. */
export function trimRelease(release) {
	const trimArtist = (artist) => ({
		id: artist.id,
		name: artist.name,
		anv: artist.anv || null,
		role: artist.role || '',
		tracks: artist.tracks || '',
	});
	const trimTrack = (track) => ({
		position: track.position || '',
		type: track.type_ || 'track',
		title: track.title || '',
		duration: track.duration || '',
		extraartists: (track.extraartists || []).map(trimArtist),
		subTracks: (track.sub_tracks || []).map(trimTrack),
	});

	return {
		id: release.id,
		masterId: release.master_id || null,
		title: release.title,
		released: release.released || null,
		year: release.year || null,
		country: release.country || null,
		labels: (release.labels || []).map((label) => ({
			name: stripDiscogsSuffix(label.name),
			catno: label.catno || null,
		})),
		formats: (release.formats || []).map((format) => ({
			name: format.name,
			qty: format.qty || null,
			descriptions: format.descriptions || [],
		})),
		artists: (release.artists || []).map(trimArtist),
		extraartists: (release.extraartists || []).map(trimArtist),
		tracklist: (release.tracklist || []).map(trimTrack),
	};
}

/** "4:04" → 244, "1:02:03" → 3723. */
export function toSeconds(duration) {
	if (!duration || !/^\d+(:\d{1,2}){1,2}$/.test(duration)) {
		return null;
	}
	return duration
		.split(':')
		.map(Number)
		.reduce((total, part) => total * 60 + part, 0);
}

/**
 * Splits a Discogs role string at top-level commas:
 * "Guitar [Lead], Vocals" → [{ role: 'Guitar', detail: 'Lead' }, { role: 'Vocals' }].
 */
export function splitRoles(roleText) {
	const parts = [];
	let depth = 0;
	let current = '';

	for (const char of String(roleText ?? '')) {
		if (char === '[') depth++;
		if (char === ']') depth = Math.max(0, depth - 1);
		if (char === ',' && depth === 0) {
			parts.push(current);
			current = '';
		} else {
			current += char;
		}
	}
	parts.push(current);

	return parts
		.map((part) => part.trim())
		.filter(Boolean)
		.map((part) => {
			const match = part.match(/^(.*?)\s*\[(.*)\]\s*$/);
			return match
				? { role: match[1].trim(), detail: match[2].trim() || null }
				: { role: part, detail: null };
		});
}

const slug = (text) =>
	String(text)
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

/** Firestore id of a musician: the Discogs artist id, or the name. */
export function musicianUid(artist) {
	return artist.id
		? `discogs-${artist.id}`
		: `discogs-name-${slug(stripDiscogsSuffix(artist.name))}`;
}

/** Tracks in play order; index tracks are replaced by their sub-tracks. */
export function toTrackDocs(albumUid, release) {
	const tracks = [];
	let heading = null;

	const add = (track) => {
		tracks.push({
			albumUid,
			index: tracks.length + 1,
			position: track.position || null,
			name: track.title,
			duration: track.duration || null,
			durationSec: toSeconds(track.duration),
			heading,
		});
	};

	for (const track of release.tracklist) {
		if (track.type === 'heading') {
			heading = track.title || null;
		} else if (track.type === 'index' && track.subTracks.length) {
			track.subTracks.forEach(add);
		} else if (track.type === 'track') {
			add(track);
		}
	}

	return tracks.map((track) => ({
		...track,
		uid: `${albumUid}_${String(track.index).padStart(3, '0')}`,
		entityType: 'Track',
		source: 'discogs',
	}));
}

/**
 * Musicians and their contributions: release-level credits plus credits that
 * only apply to some tracks (listed on the tracks themselves).
 */
export function toCreditDocs(albumUid, release) {
	const musicians = new Map();
	const contributions = new Map();

	const addCredit = (artist, tracks) => {
		const uid = musicianUid(artist);

		if (!musicians.has(uid)) {
			musicians.set(uid, {
				uid,
				name: stripDiscogsSuffix(artist.name),
				discogsId: artist.id || null,
				entityType: 'Musician',
				source: 'discogs',
			});
		}

		for (const { role, detail } of splitRoles(artist.role)) {
			const key = `${albumUid}_${uid}_${slug(role)}${
				detail ? `-${slug(detail)}` : ''
			}`;
			const existing = contributions.get(key);

			if (existing) {
				if (tracks && existing.tracks) {
					existing.tracks = `${existing.tracks}, ${tracks}`;
				}
				continue;
			}
			contributions.set(key, {
				uid: key,
				albumUid,
				musicianUid: uid,
				name: stripDiscogsSuffix(artist.name),
				creditedAs: artist.anv ? stripDiscogsSuffix(artist.anv) : null,
				role,
				roleDetail: detail,
				tracks: tracks || null,
				entityType: 'Contribution',
				source: 'discogs',
			});
		}
	};

	for (const artist of release.extraartists) {
		addCredit(artist, artist.tracks || null);
	}

	const visit = (track) => {
		for (const artist of track.extraartists) {
			addCredit(artist, track.position || track.title);
		}
		track.subTracks.forEach(visit);
	};
	release.tracklist.forEach(visit);

	return {
		musicians: Array.from(musicians.values()),
		contributions: Array.from(contributions.values()),
	};
}

/** Summary of the original release stored on the album document. */
export function toOriginalRelease(match, release) {
	return {
		masterId: match.masterId ?? null,
		releaseId: release.id,
		released: release.released,
		country: release.country,
		labels: release.labels,
		formats: release.formats.map((format) =>
			[format.name, ...format.descriptions].filter(Boolean).join(', ')
		),
	};
}

/*
 * Line-up — mirrors apps/.../shared/music-ui/credit-roles.ts: a credit is a
 * performance unless it is songwriting, production or artwork.
 */
const NON_PERFORMER_ROLE =
	/written|words by|lyrics|music by|composed|songwriter|arranged|orchestrated|produc|engineer|mix|master|record|lacquer|edited|technician|programm|a&r|artwork|design|cover|photo|layout|illustrat|paint|logo|art direction|typography|sleeve|graphics/i;
const PERFORMER_ROLE =
	/vocal|voice|guitar|bass|drum|percussion|keyboard|synth|piano|organ|sitar|timpani|violin|viola|cello|strings|sax|trumpet|trombone|horn|flute|harmonica|banjo|mandolin|choir|chorus|performer|instrument|finger snaps|clap|turntable|scratch|sampler|effects|lead|rhythm/i;

export const isPerformerRole = (role) =>
	!NON_PERFORMER_ROLE.test(role) && PERFORMER_ROLE.test(role);

/** The band's Discogs artist id: the main artist most of its releases name. */
export function bandDiscogsId(entries) {
	const counts = new Map();
	for (const entry of entries) {
		const main = entry.release?.artists?.[0];
		// 194 is Discogs' "Various" pseudo-artist.
		if (main?.id && main.id !== 194) {
			counts.set(main.id, (counts.get(main.id) ?? 0) + 1);
		}
	}
	return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

/**
 * Membership documents of one band: who played in it, on what, and from which
 * to which album year. Discogs' member list decides member vs. guest (and
 * whether the membership is still active); without that list, a release-wide
 * performer credit counts as membership and a track-limited one as guest.
 *
 * @param band    { artistUid, artistName }
 * @param entries cached album entries of the band ({ album, release })
 * @param profile cached Discogs artist ({ members: [{ id, name, active }] }) or null
 */
export function toMembershipDocs(band, entries, profile) {
	const members = new Map(
		(profile?.members ?? []).map((member) => [member.id, member])
	);
	const people = new Map();

	const personFor = (artist) => {
		const uid = musicianUid(artist);
		if (!people.has(uid)) {
			people.set(uid, {
				musicianUid: uid,
				musicianName: stripDiscogsSuffix(artist.name),
				discogsId: artist.id || null,
				instruments: new Set(),
				years: [],
				albumUids: new Set(),
				releaseWide: false,
			});
		}
		return people.get(uid);
	};

	for (const { album, release } of entries) {
		if (!release) continue;

		const credit = (artist, trackLimited) => {
			// The band credited as a whole is not a member of itself.
			if (artist.id && artist.id === profile?.id) return;

			const performed = splitRoles(artist.role)
				.map(({ role }) => role)
				.filter(isPerformerRole);
			if (!performed.length) return;

			const person = personFor(artist);
			performed.forEach((role) => person.instruments.add(role));
			person.albumUids.add(album.uid);
			if (album.year) person.years.push(album.year);
			if (!trackLimited) person.releaseWide = true;
		};

		release.extraartists.forEach((artist) =>
			credit(artist, !!artist.tracks)
		);
		const visit = (track) => {
			track.extraartists.forEach((artist) => credit(artist, true));
			track.subTracks.forEach(visit);
		};
		release.tracklist.forEach(visit);
	}

	// Members listed by Discogs but without credits on the catalog's albums.
	for (const member of members.values()) {
		personFor(member);
	}

	return [...people.values()].map((person) => {
		const member = person.discogsId ? members.get(person.discogsId) : null;
		const kind = members.size
			? member
				? 'member'
				: 'guest'
			: person.releaseWide
				? 'member'
				: 'guest';

		return {
			uid: `${band.artistUid}_${person.musicianUid}`,
			artistUid: band.artistUid,
			artistName: band.artistName,
			musicianUid: person.musicianUid,
			musicianName: person.musicianName,
			kind,
			instruments: [...person.instruments],
			from: person.years.length ? Math.min(...person.years) : null,
			to: person.years.length ? Math.max(...person.years) : null,
			active: member ? !!member.active : null,
			albumCount: person.albumUids.size,
			albumUids: [...person.albumUids],
			entityType: 'Membership',
			source: 'discogs',
		};
	});
}
