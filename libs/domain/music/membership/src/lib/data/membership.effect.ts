import {
	Observable,
	combineLatest,
	forkJoin,
	from,
	map,
	startWith,
} from 'rxjs';

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
	ArtistStateService,
	EntityTypeEnum,
	MUSICIAN_FEATURE_KEY,
	MembershipEntity,
	MusicianDataService,
	MusicianEntity,
} from '@music-collection/api';

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

/** A band's line-up and the band's own name, for the editor's heading. */
export interface Lineup {
	artistName: string;
	rows: MembershipEntity[];
}

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
				artistName: artist?.name ?? rows[0]?.artistName ?? '',
				rows,
			}))
		);
	}

	/** The bands a musician played in. */
	public loadByMusician$(
		musicianUid: string
	): Observable<MembershipEntity[]> {
		return this.repository.listByMusician$(musicianUid);
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
		existing?: MembershipEntity
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
			albumCount: existing?.albumCount ?? 0,
			albumUids: existing?.albumUids ?? [],
			entityType: EntityTypeEnum.Membership,
			source: 'manual',
		};
	}
}
