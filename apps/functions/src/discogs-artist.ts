/**
 * Egy Discogs előadó profilja a zenész szerkesztőűrlapjához (Load gomb). A
 * mezők ugyanazok, amiket az import a `musician` dokumentumba ír
 * (tools/discogs/discogs-mapping.mjs `toMusicianProfileDoc`). A formátum a
 * kliens `MusicianExternalProfile` típusa (libs/api … musician-external.ts).
 */

import { DiscogsRequestOptions, discogsGet, text } from './discogs-api';

export interface DiscogsArtistProfile {
	/** Discogs artist id. */
	id: number;
	name: string;
	realName: string | null;
	description: string | null;
	sites: string[];
	aliases: string[];
	nameVariations: string[];
	imageUrl: string | null;
}

/** Az `/artists/{id}` válasz használt mezői. */
export interface DiscogsApiArtist {
	id?: unknown;
	name?: unknown;
	realname?: unknown;
	profile?: unknown;
	urls?: unknown;
	namevariations?: unknown;
	aliases?: { name?: unknown }[];
	images?: { type?: unknown; uri?: unknown }[];
}

/** "Testament (2)" → "Testament" (a Discogs egyértelműsítő utótagja). */
export const stripDiscogsSuffix = (name: string): string =>
	name.replace(/\s*\(\d+\)\s*$/, '').trim();

const texts = (value: unknown): string[] =>
	Array.isArray(value)
		? value.map(text).filter((item): item is string => !!item)
		: [];

export function toArtistProfile(
	artist: DiscogsApiArtist
): DiscogsArtistProfile | null {
	const id = Number(artist.id);

	if (!Number.isSafeInteger(id) || id <= 0) return null;

	const images = artist.images ?? [];
	const primary =
		images.find((image) => image.type === 'primary') ?? images[0];

	return {
		id,
		name: stripDiscogsSuffix(text(artist.name) ?? ''),
		realName: text(artist.realname),
		description: text(artist.profile),
		sites: texts(artist.urls).filter((url) => /^https?:\/\//i.test(url)),
		aliases: [
			...new Set(
				(artist.aliases ?? [])
					.map((alias) => text(alias.name))
					.filter((name): name is string => !!name)
					.map(stripDiscogsSuffix)
			),
		],
		nameVariations: texts(artist.namevariations),
		imageUrl: text(primary?.uri),
	};
}

export async function fetchArtistProfile(
	artistId: number,
	options: DiscogsRequestOptions = {}
): Promise<DiscogsArtistProfile | null> {
	return toArtistProfile(
		await discogsGet<DiscogsApiArtist>(`/artists/${artistId}`, options)
	);
}
