import {
	Observable,
	catchError,
	combineLatest,
	concatMap,
	forkJoin,
	from,
	map,
	of,
	startWith,
	switchMap,
	toArray,
} from 'rxjs';

import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
	Firestore,
	collection,
	endAt,
	getDocs,
	limit,
	orderBy,
	query,
	startAt,
} from '@angular/fire/firestore';
import {
	AlbumEntity,
	ArtistEntity,
	ArtistExternalCandidate,
	ArtistExternalQuery,
	ArtistStateService,
	EntityTypeEnum,
	MUSICIAN_FEATURE_KEY,
	MembershipEntity,
	MusicBrainzClient,
	MusicianDataService,
	MusicianEntity,
} from '@music-collection/api';

import {
	LineupCandidate,
	MusicBrainzBand,
	mergeCandidates,
	nameKey,
	toCatalogCandidates,
	toExternalMembers,
} from './lineup-candidates';
import { MembershipRepository } from './membership.repository';

/** What the line-up editor knows about one row while it is being edited. */
export interface MembershipDraft {
	/** Null for a row that is not saved yet. */
	uid: string | null;
	artistUid: string;
	artistName: string;
	musicianUid: string;
	musicianName: string;
	kind: 'member' | 'guest';
	instruments: string[];
	from: number | null;
	to: number | null;
	/** Still in the band: the line-up shows "present" instead of an end year. */
	active: boolean;
}

/** A band's line-up, with the band itself for the heading and the lookups. */
export interface Lineup {
	artist: ArtistEntity | undefined;
	artistName: string;
	rows: MembershipEntity[];
}

/** What the candidate lookup needs to know about the band. */
export interface LineupLookup {
	artistUid: string;
	artistName: string;
	albums: AlbumEntity[];
	/** The band on MusicBrainz; null leaves its members out of the list. */
	musicBrainzId: string | null;
	/** The rows already in the line-up, which are not offered again. */
	existing: MembershipEntity[];
}

/** The result of a lookup: what to offer, and whether a source failed. */
export interface LineupLookupResult {
	candidates: LineupCandidate[];
	/** True when MusicBrainz could not be reached; the catalog still counts. */
	externalFailed: boolean;
}

/** At most this many names are looked up in the catalog after a lookup. */
const MATCH_LIMIT = 12;

/** How many names the musician search offers at once. */
const SEARCH_LIMIT = 10;

/** "bill steer" → "Bill Steer", the spelling names are stored in. */
const titleCase = (term: string): string =>
	term.replace(/(^|\s)(\p{Ll})/gu, (_, space: string, letter: string) =>
		space === undefined ? letter : space + letter.toUpperCase()
	);

/**
 * The line-up: reading a band's or a musician's memberships, and writing the
 * ones an admin edits by hand. A hand-written row is marked `manual`, which
 * is what keeps the Discogs importer from replacing it later.
 *
 * Provided by the components that use it, not in the root injector: the
 * musician data service it writes new musicians through is bound in the
 * admin module, which the root injector cannot see.
 */
@Injectable()
export class MembershipEffect {
	private readonly artistStateService = inject(ArtistStateService);
	private readonly firestore = inject(Firestore);
	private readonly musicBrainz = inject(MusicBrainzClient);
	private readonly musicianDataService = inject(MusicianDataService);
	private readonly repository = inject(MembershipRepository);

	/** The line-up of a band. */
	public load$(artistUid: string): Observable<MembershipEntity[]> {
		return this.repository.listByArtist$(artistUid);
	}

	/**
	 * The line-up with the band's name, which every membership carries as
	 * well. The name is started empty: the line-up must not wait on a store
	 * that may never emit for an artist the admin has just created.
	 */
	public loadLineup$(artistUid: string): Observable<Lineup> {
		return combineLatest([
			this.repository.listByArtist$(artistUid),
			this.artistStateService
				.selectEntityById$(artistUid)
				.pipe(startWith(undefined)),
		]).pipe(
			map(([rows, artist]) => ({
				artist,
				artistName: artist?.name ?? rows[0]?.artistName ?? '',
				rows,
			}))
		);
	}

	/** The band's albums, which the catalog's credits are read through. */
	public loadAlbums$(artistUid: string): Observable<AlbumEntity[]> {
		this.artistStateService.dispatchListAlbumsByIdAction(artistUid);

		return this.artistStateService
			.selectAlbumsById$(artistUid)
			.pipe(
				map((albums) =>
					albums.filter((album) => album.artist?.uid === artistUid)
				)
			);
	}

	/** The bands a musician played in. */
	public loadByMusician$(
		musicianUid: string
	): Observable<MembershipEntity[]> {
		return this.repository.listByMusician$(musicianUid);
	}

	/**
	 * Who the line-up could take in, from both sources at once: the band's
	 * `member of band` relations on MusicBrainz, which carry the years, and
	 * the catalog's own credits, which carry the guests and the instruments.
	 * Names already in the line-up are left out.
	 */
	public loadCandidates$(
		lookup: LineupLookup
	): Observable<LineupLookupResult> {
		const known = new Set(
			lookup.existing.flatMap((row) => [
				row.musicianUid,
				nameKey(row.musicianName ?? ''),
			])
		);

		return forkJoin([
			lookup.musicBrainzId
				? this.fetchExternalMembers$(lookup.musicBrainzId).pipe(
						// A source that will not answer must not take the
						// other one down with it: the credits are here.
						catchError((error) => {
							console.error(error);

							return of(null);
						})
					)
				: of([]),
			this.repository
				.listContributionsByAlbums$(
					lookup.albums.map((album) => album.uid)
				)
				.pipe(
					map((contributions) =>
						toCatalogCandidates(
							lookup.albums,
							contributions,
							lookup.artistName
						)
					)
				),
		]).pipe(
			switchMap(([external, catalog]) =>
				this.matchMusicians$(
					mergeCandidates(external ?? [], catalog).filter(
						(candidate) =>
							!known.has(candidate.musicianUid ?? '') &&
							!known.has(nameKey(candidate.musicianName))
					)
				).pipe(
					map((candidates) => ({
						candidates,
						externalFailed: external === null,
					}))
				)
			)
		);
	}

	/** The band's line-up on MusicBrainz, by its id there. */
	public fetchExternalMembers$(
		musicBrainzId: string
	): Observable<LineupCandidate[]> {
		return this.musicBrainz
			.get$<MusicBrainzBand>(
				`/artist/${musicBrainzId}`,
				new HttpParams().set('inc', 'artist-rels').set('fmt', 'json')
			)
			.pipe(map(toExternalMembers));
	}

	/** The bands of this name on MusicBrainz, to tell namesakes apart. */
	public searchExternalArtists$(
		query: ArtistExternalQuery
	): Observable<ArtistExternalCandidate[]> {
		return this.artistStateService.searchExternalArtists$(query);
	}

	/**
	 * Writes the chosen candidates as memberships, in one batch. A name the
	 * catalog does not know yet becomes a musician first — created one at a
	 * time, because each needs its own id back.
	 */
	public applyCandidates$(
		candidates: LineupCandidate[],
		artistUid: string,
		artistName: string
	): Observable<number> {
		if (!candidates.length) {
			return of(0);
		}

		return from(candidates).pipe(
			concatMap((candidate) =>
				candidate.musicianUid
					? of({
							...candidate,
							musicianUid: candidate.musicianUid,
						})
					: this.createMusician$(candidate.musicianName).pipe(
							map((musician) => ({
								...candidate,
								musicianUid: musician.uid,
							}))
						)
			),
			// The whole list is gathered before anything is written: one
			// batch is one sync bump, and the page redraws once.
			toArray(),
			switchMap((rows) =>
				from(
					this.repository.saveAll(
						rows.map((row) =>
							this.toEntity(
								{
									uid: null,
									artistUid,
									artistName,
									musicianUid: row.musicianUid as string,
									musicianName: row.musicianName,
									kind: row.kind,
									instruments: row.instruments,
									from: row.from,
									to: row.to,
									active: row.active,
								},
								undefined,
								{
									albumCount: row.albumCount,
									albumUids: row.albumUids,
									source: row.source,
								}
							)
						)
					)
				).pipe(map(() => rows.length))
			)
		);
	}

	/**
	 * Binds the candidates to the catalog's musicians by name; what stays
	 * unbound is created on apply. Only the unbound ones are looked up, and
	 * only up to a limit — a line-up is a dozen names, not a thousand.
	 */
	private matchMusicians$(
		candidates: LineupCandidate[]
	): Observable<LineupCandidate[]> {
		const unmatched = candidates
			.filter((candidate) => !candidate.musicianUid)
			.slice(0, MATCH_LIMIT);

		if (!unmatched.length) {
			return of(candidates);
		}

		return forkJoin(
			unmatched.map((candidate) =>
				this.searchMusicians$(candidate.musicianName).pipe(
					map((found) => ({
						name: nameKey(candidate.musicianName),
						uid:
							found.find(
								(musician) =>
									nameKey(musician.name) ===
									nameKey(candidate.musicianName)
							)?.uid ?? null,
					}))
				)
			)
		).pipe(
			map((matches) => {
				const byName = new Map(
					matches.map((match) => [match.name, match.uid])
				);

				return candidates.map((candidate) =>
					candidate.musicianUid
						? candidate
						: {
								...candidate,
								musicianUid:
									byName.get(
										nameKey(candidate.musicianName)
									) ?? null,
							}
				);
			})
		);
	}

	/**
	 * Creates or overwrites one membership. The uid pairs the band with the
	 * musician (`{artistUid}_{musicianUid}`), the same key the importer uses,
	 * so a row added here and the same pair imported later stay one document.
	 */
	public save$(
		draft: MembershipDraft,
		existing?: MembershipEntity
	): Observable<MembershipEntity> {
		const membership = this.toEntity(draft, existing);

		return from(this.repository.save(membership)).pipe(
			map(() => membership)
		);
	}

	public remove$(uid: string): Observable<void> {
		return from(this.repository.remove(uid));
	}

	/**
	 * Musicians whose name starts with the term. The `musician` documents
	 * carry no `searchParameters` (the Discogs import writes none), so the
	 * name itself is searched on — both as typed and title-cased, which is
	 * the spelling the catalog stores.
	 */
	public searchMusicians$(term: string): Observable<MusicianEntity[]> {
		const terms = [...new Set([term, titleCase(term)])];

		return forkJoin(terms.map((prefix) => this.findByName(prefix))).pipe(
			map((results) => {
				const found = new Map<string, MusicianEntity>();

				results
					.flat()
					.forEach((musician) => found.set(musician.uid, musician));

				return [...found.values()]
					.sort((a, b) => a.name.localeCompare(b.name))
					.slice(0, SEARCH_LIMIT);
			})
		);
	}

	/** A musician the catalog does not know yet, created from the name alone. */
	public createMusician$(name: string): Observable<MusicianEntity> {
		return this.musicianDataService
			.add$({
				name,
				discogsId: null,
				entityType: EntityTypeEnum.Musician,
				searchParameters: this.searchParameters(name),
				source: 'manual',
			})
			.pipe(map((musician) => musician as MusicianEntity));
	}

	private findByName(prefix: string): Observable<MusicianEntity[]> {
		return from(
			getDocs(
				query(
					collection(this.firestore, MUSICIAN_FEATURE_KEY),
					orderBy('name'),
					startAt(prefix),
					endAt(`${prefix}`),
					limit(SEARCH_LIMIT)
				)
			)
		).pipe(
			map((snapshot) =>
				snapshot.docs.map(
					(document) =>
						({
							...document.data(),
							uid: document.id,
						}) as MusicianEntity
				)
			)
		);
	}

	/** Prefixes of the lower-case name, as the catalog's search expects. */
	private searchParameters(name: string): string[] {
		const lower = name.toLowerCase();

		return Array.from(lower, (_, index) => lower.slice(0, index + 1));
	}

	/**
	 * The document behind a row. A guest has no "still in the band" state —
	 * they played on some records and that is all the years say.
	 */
	private toEntity(
		draft: MembershipDraft,
		existing?: MembershipEntity,
		loaded?: {
			albumCount: number;
			albumUids: string[];
			source: 'musicbrainz' | 'catalog';
		}
	): MembershipEntity {
		const active = draft.kind === 'member' ? draft.active : null;

		return {
			...existing,
			uid: draft.uid ?? `${draft.artistUid}_${draft.musicianUid}`,
			artistUid: draft.artistUid,
			artistName: draft.artistName,
			musicianUid: draft.musicianUid,
			musicianName: draft.musicianName,
			kind: draft.kind,
			instruments: draft.instruments,
			from: draft.from,
			to: active ? null : draft.to,
			active,
			albumCount: loaded?.albumCount ?? existing?.albumCount ?? 0,
			albumUids: loaded?.albumUids ?? existing?.albumUids ?? [],
			entityType: EntityTypeEnum.Membership,
			// Anything but `discogs`, so the importer's replace mode leaves
			// the row alone; which of the three it was stays on record.
			source: loaded?.source ?? 'manual',
		};
	}
}
