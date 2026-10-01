import { FormatEnum } from '@music-collection/common/api';
import { DiscographyCandidate } from '@music-collection/domain/music-collection/api';

import {
	listDiscographyCandidates,
	planDiscography,
	soleArtistOf,
} from './music-collection-discography';
import { album } from './music-collection.fixture';

const THRASH = ['Bay Area Thrash'];

function lp(uid: string, artistUid: string, artistName: string) {
	return album(uid, `Album ${uid}`, artistUid, artistName, 1988, THRASH);
}

function other(
	uid: string,
	artistUid: string,
	artistName: string,
	format: FormatEnum
) {
	return album(
		uid,
		`Album ${uid}`,
		artistUid,
		artistName,
		1988,
		THRASH,
		format
	);
}

function candidate(
	overrides: Partial<DiscographyCandidate> = {}
): DiscographyCandidate {
	return {
		artistUid: 'iron-maiden',
		artistName: 'Iron Maiden',
		slug: 'iron-maiden',
		studioAlbumCount: 17,
		companionAlbumCount: 4,
		coveredBy: null,
		...overrides,
	};
}

describe('soleArtistOf', () => {
	it('names the band a rule follows alone', () => {
		expect(soleArtistOf({ artists: { includesAny: ['maiden'] } })).toBe(
			'maiden'
		);
	});

	it('is nobody for a rule over a scene, or over two bands', () => {
		expect(
			soleArtistOf({ styles: { includesAny: ['Thrash'] } })
		).toBeNull();
		expect(
			soleArtistOf({ artists: { includesAny: ['maiden', 'priest'] } })
		).toBeNull();
	});
});

describe('listDiscographyCandidates', () => {
	it('offers the bands with two studio albums, and not the rest', () => {
		const candidates = listDiscographyCandidates([
			lp('new-order', 'testament', 'Testament'),
			lp('practice', 'testament', 'Testament'),
			lp('justice', 'metallica', 'Metallica'),
		]);

		expect(candidates.map(({ artistUid }) => artistUid)).toEqual([
			'testament',
		]);
		expect(candidates[0].studioAlbumCount).toBe(2);
	});

	it('counts what is not a studio album apart from what is', () => {
		const [found] = listDiscographyCandidates([
			lp('new-order', 'testament', 'Testament'),
			lp('practice', 'testament', 'Testament'),
			other('eindhoven', 'testament', 'Testament', FormatEnum.live),
			other('return', 'testament', 'Testament', FormatEnum.single),
			other('first', 'testament', 'Testament', FormatEnum.ep),
		]);

		expect(found.studioAlbumCount).toBe(2);
		expect(found.companionAlbumCount).toBe(3);
	});

	it('leaves out an album the catalog has no format for', () => {
		const candidates = listDiscographyCandidates([
			lp('new-order', 'testament', 'Testament'),
			lp('practice', 'testament', 'Testament'),
			album(
				'undated',
				'Undated Demo',
				'testament',
				'Testament',
				null,
				THRASH,
				null
			),
		]);

		expect(candidates[0].companionAlbumCount).toBe(0);
	});

	it('says which rule already follows a band, and offers it last', () => {
		const candidates = listDiscographyCandidates(
			[
				lp('new-order', 'testament', 'Testament'),
				lp('practice', 'testament', 'Testament'),
				lp('practice-what', 'testament', 'Testament'),
				lp('number', 'maiden', 'Iron Maiden'),
				lp('powerslave', 'maiden', 'Iron Maiden'),
			],
			[
				{
					name: 'Iron Maiden on Vinyl',
					slug: 'iron-maiden',
					criteria: { artists: { includesAny: ['maiden'] } },
				},
			]
		);

		expect(
			candidates.map(({ artistUid, coveredBy }) => [artistUid, coveredBy])
		).toEqual([
			['testament', null],
			['maiden', 'Iron Maiden on Vinyl'],
		]);
	});

	it('numbers the slug of a band whose name is taken by a definition', () => {
		const [found] = listDiscographyCandidates(
			[
				lp('new-order', 'testament', 'Testament'),
				lp('practice', 'testament', 'Testament'),
			],
			[
				{
					name: 'Testament — Studio Albums',
					slug: 'testament-studio-albums',
					criteria: { styles: { includesAny: ['Thrash'] } },
				},
			]
		);

		expect(found.slug).toBe('testament-2');
	});

	/**
	 * The Discogs import files the same band twice, and the number is not
	 * part of a name — so both of these ask for `testament`, and the second
	 * would be handed a slug the first is about to take.
	 */
	it('numbers the slug of the second band of the same name', () => {
		const candidates = listDiscographyCandidates([
			lp('new-order', 'testament', 'Testament'),
			lp('practice', 'testament', 'Testament'),
			lp('souls', 'testament', 'Testament'),
			lp('low', 'testament-2', 'Testament (2)'),
			lp('demonic', 'testament-2', 'Testament (2)'),
		]);

		expect(candidates.map(({ slug }) => slug)).toEqual([
			'testament',
			'testament-2',
		]);
	});

	it('drops the Discogs number from the name', () => {
		const [found] = listDiscographyCandidates([
			lp('new-order', 'testament-2', 'Testament (2)'),
			lp('practice', 'testament-2', 'Testament (2)'),
		]);

		expect(found.artistName).toBe('Testament');
	});
});

describe('planDiscography', () => {
	it('asks for the studio albums of the band, and nothing else', () => {
		const { main } = planDiscography(candidate());

		expect(main.criteria).toEqual({
			artists: { includesAny: ['iron-maiden'] },
			albumFormats: { includesAny: [FormatEnum.lp] },
		});
		expect(main.slug).toBe('iron-maiden-studio-albums');
		expect(main.group).toBe('discography');
		expect(main.status).toBe('published');
	});

	it('names the companion formats rather than excluding the albums', () => {
		const { companion } = planDiscography(candidate());

		expect(companion.criteria.albumFormats).toEqual({
			includesAny: [
				FormatEnum.ep,
				FormatEnum.single,
				FormatEnum.maxi,
				FormatEnum.live,
				FormatEnum.compilation,
			],
		});
		expect(companion.slug).toBe('iron-maiden-beyond-the-albums');
		expect(companion.group).toBe('discography');
	});

	it('leaves the companion a draft while it would catch nothing', () => {
		expect(
			planDiscography(candidate({ companionAlbumCount: 0 })).companion
				.status
		).toBe('draft');
		expect(
			planDiscography(candidate({ companionAlbumCount: 1 })).companion
				.status
		).toBe('published');
	});

	it('leaves the parent to the caller: the main one does not exist yet', () => {
		expect(planDiscography(candidate()).companion.parentUid).toBeNull();
	});

	it('builds both slugs on the base the candidate carries', () => {
		const plan = planDiscography(candidate({ slug: 'testament-2' }));

		expect(plan.main.slug).toBe('testament-2-studio-albums');
		expect(plan.companion.slug).toBe('testament-2-beyond-the-albums');
	});

	it('falls back on the uid when the name makes no slug', () => {
		const [found] = listDiscographyCandidates([
			album('a', 'A', 'discogs-123', '人間椅子', 1988, THRASH),
			album('b', 'B', 'discogs-123', '人間椅子', 1988, THRASH),
		]);

		expect(planDiscography(found).main.slug).toBe(
			'discogs-123-studio-albums'
		);
	});
});
