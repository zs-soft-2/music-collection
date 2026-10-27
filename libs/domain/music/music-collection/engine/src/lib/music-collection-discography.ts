import { slugify, stripDiscogsSuffix } from '@music-collection/common/engine';
import {
	CatalogAlbum,
	DISCOGRAPHY_COMPANION_FORMATS,
	DISCOGRAPHY_COMPANION_SLUG_SUFFIX,
	DISCOGRAPHY_MAIN_SLUG_SUFFIX,
	DISCOGRAPHY_STUDIO_ALBUM_MINIMUM,
	DISCOGRAPHY_STUDIO_FORMATS,
	DiscographyCandidate,
	DiscographyPlan,
	MusicCollectionCriteria,
} from '@music-collection/domain/music-collection/api';

/**
 * Opening a band's discography.
 *
 * Two questions live here, and both are answered from the catalog alone:
 * which bands the catalog knows enough of to be worth a collection, and what
 * the two collections of such a band say. Nothing is written here — the
 * drafts go to the callable like any other definition, so a discography is
 * validated, versioned and editable afterwards exactly as a curated
 * collection is.
 */

/** A definition, as the questions "whose band is taken" and "which slugs are" read it. */
export interface CollectionCoverage {
	name: string;
	slug: string;
	criteria: MusicCollectionCriteria;
}

/** Keeps the longest band name from pushing the slug past the server's limit. */
const MAX_SLUG_BASE_LENGTH = 80;

/** The slug base of a band nothing else can be made of. */
const FALLBACK_SLUG = 'band';

/**
 * The band a rule follows alone, or null. A rule naming one artist and
 * nothing else of them — no second artist — is that band's collection,
 * whatever else it filters on: it is the records of one band, which is what
 * a discography would ask for again.
 */
export function soleArtistOf(criteria: MusicCollectionCriteria): string | null {
	const artists = criteria.artists?.includesAny;

	return artists?.length === 1 ? artists[0] : null;
}

/** Both slugs a base would be used for. */
function slugsOf(base: string): string[] {
	return [
		`${base}${DISCOGRAPHY_MAIN_SLUG_SUFFIX}`,
		`${base}${DISCOGRAPHY_COMPANION_SLUG_SUFFIX}`,
	];
}

function baseOf(artistName: string, artistUid: string): string {
	const base = slugify(artistName) || slugify(artistUid) || FALLBACK_SLUG;

	return base.slice(0, MAX_SLUG_BASE_LENGTH).replace(/-+$/, '');
}

/**
 * A slug base both of whose collections can still be written, numbering it
 * where it cannot.
 *
 * A slug is part of the URL, so the server keeps it to one collection. Two
 * bands run into each other here more often than it looks: the Discogs
 * import files the same band twice as "Testament" and "Testament (2)", and
 * the number is not part of a name — both would ask for `testament`.
 */
function freeSlugBase(
	artistName: string,
	artistUid: string,
	taken: Set<string>
): string {
	const base = baseOf(artistName, artistUid);

	for (let attempt = 1; ; attempt += 1) {
		const candidate = attempt === 1 ? base : `${base}-${attempt}`;

		if (slugsOf(candidate).every((slug) => !taken.has(slug))) {
			return candidate;
		}
	}
}

/**
 * The bands worth a discography, richest first, and the ones already
 * followed last.
 *
 * Counted over the albums the catalog already holds in memory, so the list
 * costs a pass over it rather than a query. A band whose records are filed
 * under two artists (the Discogs import makes "Testament (2)" beside
 * "Testament") is counted as two bands, because the albums hang off two
 * uids and a rule can only name a uid.
 */
export function listDiscographyCandidates(
	albums: readonly CatalogAlbum[],
	definitions: readonly CollectionCoverage[] = []
): DiscographyCandidate[] {
	const studio = new Set<string>(DISCOGRAPHY_STUDIO_FORMATS);
	const companion = new Set<string>(DISCOGRAPHY_COMPANION_FORMATS);
	const counts = new Map<string, DiscographyCandidate>();

	for (const album of albums) {
		if (!album.artistUid || !album.format) {
			continue;
		}

		const isStudio = studio.has(album.format);

		if (!isStudio && !companion.has(album.format)) {
			continue;
		}

		const candidate = counts.get(album.artistUid) ?? {
			artistUid: album.artistUid,
			artistName: stripDiscogsSuffix(album.artistName),
			slug: '',
			studioAlbumCount: 0,
			companionAlbumCount: 0,
			coveredBy: null,
		};

		if (isStudio) {
			candidate.studioAlbumCount += 1;
		} else {
			candidate.companionAlbumCount += 1;
		}

		counts.set(album.artistUid, candidate);
	}

	const covers = new Map<string, string>();
	const takenSlugs = new Set<string>();

	for (const definition of definitions) {
		const artistUid = soleArtistOf(definition.criteria);

		takenSlugs.add(definition.slug);

		if (artistUid && !covers.has(artistUid)) {
			covers.set(artistUid, definition.name);
		}
	}

	return [...counts.values()]
		.filter(
			(candidate) =>
				candidate.studioAlbumCount >= DISCOGRAPHY_STUDIO_ALBUM_MINIMUM
		)
		.sort(
			(one, other) =>
				other.studioAlbumCount - one.studioAlbumCount ||
				one.artistName.localeCompare(other.artistName)
		)
		.map((candidate) => {
			/*
			 * Numbered against the bands before it as well as against the
			 * definitions: two bands of the same name are in this very list,
			 * and the second would otherwise be handed a slug the first is
			 * about to take.
			 */
			const slug = freeSlugBase(
				candidate.artistName,
				candidate.artistUid,
				takenSlugs
			);

			for (const used of slugsOf(slug)) {
				takenSlugs.add(used);
			}

			return {
				...candidate,
				slug,
				coveredBy: covers.get(candidate.artistUid) ?? null,
			};
		})
		.sort(
			(one, other) =>
				Number(Boolean(one.coveredBy)) -
				Number(Boolean(other.coveredBy))
		);
}

/**
 * The two collections of a band's discography.
 *
 * The companion is a draft while the catalog holds nothing for it to catch:
 * a published collection of no records would stand in everyone's list
 * showing 0 of 0 forever. It can never be completed either way — an empty
 * collection is not finished, it is empty — so nothing is lost by waiting
 * for the first single to arrive.
 *
 * Both rules name the formats they take rather than excluding the others:
 * an album saved before the format field existed has no format at all, and
 * "not a studio album" would collect every one of them.
 */
export function planDiscography(
	candidate: DiscographyCandidate
): DiscographyPlan {
	const slug =
		candidate.slug || baseOf(candidate.artistName, candidate.artistUid);
	const name = candidate.artistName;
	const artists = { includesAny: [candidate.artistUid] };

	return {
		main: {
			name: `${name} — Studio Albums`,
			slug: `${slug}${DISCOGRAPHY_MAIN_SLUG_SUFFIX}`,
			description: `Every studio album ${name} put out, as the catalog knows them.`,
			coverImageUrl: null,
			icon: 'pi pi-user',
			criteria: {
				artists,
				albumFormats: { includesAny: [...DISCOGRAPHY_STUDIO_FORMATS] },
			},
			badge: {
				name: `${name} Completist`,
				description: `Own every studio album ${name} put out.`,
				icon: 'pi pi-user',
				artworkUrl: null,
			},
			basePoints: null,
			parentUid: null,
			group: 'discography',
			status: 'published',
			visibility: 'public',
		},
		companion: {
			name: `${name} — Beyond the Albums`,
			slug: `${slug}${DISCOGRAPHY_COMPANION_SLUG_SUFFIX}`,
			description: `What the studio albums leave out: the singles, EPs, live records and compilations of ${name}.`,
			coverImageUrl: null,
			icon: 'pi pi-list',
			criteria: {
				artists,
				albumFormats: {
					includesAny: [...DISCOGRAPHY_COMPANION_FORMATS],
				},
			},
			badge: {
				name: `${name} Deep Cuts`,
				description: `Own everything else ${name} released.`,
				icon: 'pi pi-list',
				artworkUrl: null,
			},
			basePoints: null,
			/* Set to the main collection once the server has written it. */
			parentUid: null,
			group: 'discography',
			status: candidate.companionAlbumCount > 0 ? 'published' : 'draft',
			visibility: 'public',
		},
	};
}
