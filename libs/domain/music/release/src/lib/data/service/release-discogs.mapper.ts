import {
	DiscogsMasterCandidate,
	DiscogsVersion,
	FormatDescriptionEnum,
	FormatDescriptionList,
	LabelEntity,
	MediaEnum,
	ReleaseCountryEnum,
	ReleaseCountryList,
	ReleaseExternalPressing,
} from '@music-collection/api';
import { isSameCatalogName } from '@music-collection/common/engine';

/**
 * Discogs' own carrier names against the catalog's media. A box set is the
 * packaging and not the carrier, and Discogs often lists it before the record
 * itself, so it is only taken where nothing more concrete is named — the rule
 * `discogsMedia` follows on the server when it imports a pressing.
 */
const MEDIA: Record<string, MediaEnum> = {
	vinyl: MediaEnum.vinyl,
	cd: MediaEnum.cd,
	cassette: MediaEnum.cassette,
	dvd: MediaEnum.dvd,
	'box set': MediaEnum.boxset,
};

/** Discogs' format descriptions against the catalog's; the rest are dropped. */
const DESCRIPTIONS: Record<string, FormatDescriptionEnum> = {
	'box set': FormatDescriptionEnum.boxSet,
	'deluxe edition': FormatDescriptionEnum.deluxeEdition,
	'180 gram': FormatDescriptionEnum.g180,
	'180g': FormatDescriptionEnum.g180,
	gatefold: FormatDescriptionEnum.gatefold,
	'limited edition': FormatDescriptionEnum.limitedEdition,
	'picture disc': FormatDescriptionEnum.pictureDisc,
	reissue: FormatDescriptionEnum.reissue,
	remastered: FormatDescriptionEnum.remastered,
};

/**
 * The Discogs master of the album, out of what the title search answered.
 *
 * Discogs answers a title search widely — reissues, tributes and covers of
 * the same name all come back — so only a hit whose artist and title both
 * match counts, and of those the earliest: a master is the original album.
 * The same choice `pickDiscogsMaster` makes for the album form; the two
 * forms ask Discogs the same question and must land on the same record.
 */
export function pickMasterId(
	artistName: string,
	albumName: string,
	candidates: DiscogsMasterCandidate[] | undefined
): number | null {
	const matches = (candidates ?? []).filter(
		(candidate) =>
			isSameCatalogName(candidate.name, albumName) &&
			// Discogs leaves the artist out of some hits; the search already
			// ran on the artist, so an unnamed one is not ruled out.
			(!candidate.artistName ||
				isSameCatalogName(candidate.artistName, artistName))
	);

	return (
		[...matches].sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999))[0]
			?.masterId ?? null
	);
}

/** Everything Discogs says about a pressing's format, as single words. */
function formatParts(version: DiscogsVersion): string[] {
	return [...version.majorFormats, ...(version.format?.split(',') ?? [])]
		.map((part) => part.trim().toLowerCase())
		.filter(Boolean);
}

/** The carrier: the first one named that is not the packaging. */
export function toMedia(version: DiscogsVersion): MediaEnum | null {
	const known = formatParts(version)
		.map((part) => MEDIA[part])
		.filter(Boolean);

	return (
		known.find((media) => media !== MediaEnum.boxset) ?? known[0] ?? null
	);
}

export function toFormatDescriptions(
	version: DiscogsVersion
): FormatDescriptionEnum[] {
	const found = new Set(
		formatParts(version)
			.map((part) => DESCRIPTIONS[part])
			.filter(Boolean)
	);

	return FormatDescriptionList.filter((description) =>
		found.has(description)
	);
}

/**
 * The country as the select can hold it: the catalog's own spelling where it
 * has one, the Discogs text otherwise. The list the form offers is short and
 * the catalog has always stored whatever an import wrote, so a pressing from
 * a country nobody has entered yet still loads — `countryOptions` is what
 * puts it in front of the admin.
 */
export function toCountry(version: DiscogsVersion): ReleaseCountryEnum | null {
	const country = version.country?.trim();

	if (!country) {
		return null;
	}

	return (
		ReleaseCountryList.find(
			(known) => known.toLowerCase() === country.toLowerCase()
		) ?? (country as ReleaseCountryEnum)
	);
}

/**
 * The country list the select offers: the four the catalog knows plus
 * whatever these releases actually carry. Without it a pressing from
 * Germany — or the one being edited — has no option to sit on and the field
 * reads as empty.
 */
export function countryOptions(
	...countries: (ReleaseCountryEnum | string | null | undefined)[]
): ReleaseCountryEnum[] {
	const extra = countries
		.filter((country): country is string => !!country)
		.filter(
			(country) =>
				!ReleaseCountryList.some(
					(known) => known.toLowerCase() === country.toLowerCase()
				)
		) as ReleaseCountryEnum[];

	return [...new Set([...ReleaseCountryList, ...extra])];
}

/**
 * A pressing as the form's fields. The label is the catalog's own document
 * where one carries that name — Discogs names a label, only the catalog can
 * say which one it is — and `labelName` reports the name either way, so an
 * unmatched label is told to the admin instead of silently dropped.
 */
export function toExternalPressing(
	version: DiscogsVersion,
	labels: readonly LabelEntity[]
): ReleaseExternalPressing {
	const labelName = version.label?.trim() || null;
	const label =
		(labelName &&
			labels.find((candidate) =>
				isSameCatalogName(candidate.name, labelName)
			)) ||
		null;

	return {
		catno: version.catno?.trim() || null,
		country: toCountry(version),
		// Discogs dates a version by year only; the day stays the admin's.
		date: version.year ? new Date(version.year, 0, 1) : null,
		discogsReleaseId: version.id,
		formatDescription: toFormatDescriptions(version),
		label,
		labelName,
		media: toMedia(version),
		name: version.title,
	};
}
