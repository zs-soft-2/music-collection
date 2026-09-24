import { EntityTypeEnum } from '@music-collection/common/api';
import { MusicCollectionEntity } from '@music-collection/domain/music-collection/api';
import { MusicCollectionResolution } from '@music-collection/domain/music-collection/core';

import {
	describeCriteria,
	slugify,
	toCriteria,
	toCriteriaForm,
	toDraft,
	toForm,
	toRows,
} from './music-collection-admin.mapper';
import {
	emptyCollectionForm,
	emptyCriteriaForm,
} from './music-collection-admin.model';

function collection(
	overrides: Partial<MusicCollectionEntity> = {}
): MusicCollectionEntity {
	return {
		entityType: EntityTypeEnum.MusicCollection,
		uid: 'bay-area-1988',
		name: '1988 Bay Area Thrash',
		slug: 'bay-area-1988',
		description: null,
		coverImageUrl: null,
		icon: null,
		criteria: {},
		badge: null,
		basePoints: null,
		parentUid: null,
		status: 'draft',
		visibility: 'public',
		createdAt: 0,
		criteriaVersion: 1,
		...overrides,
	};
}

describe('slugify', () => {
	it('makes a readable slug of the name', () => {
		expect(slugify('1988 Bay Area Thrash')).toBe('1988-bay-area-thrash');
		expect(slugify('  Mötley Crüe!  ')).toBe('motley-crue');
	});
});

describe('toCriteria', () => {
	it('leaves out what the editor has not filled in', () => {
		expect(toCriteria(emptyCriteriaForm())).toEqual({});
	});

	it('takes the year bounds that are given', () => {
		expect(
			toCriteria({ ...emptyCriteriaForm(), yearFrom: 1980 }).years
		).toEqual({ from: 1980 });
		expect(
			toCriteria({ ...emptyCriteriaForm(), yearFrom: 1980, yearTo: 1989 })
				.years
		).toEqual({ from: 1980, to: 1989 });
	});

	it('writes the enum criterion under its operator', () => {
		const form = emptyCriteriaForm();

		form.styles = { operator: 'excludes', values: ['Thrash'] };

		expect(toCriteria(form).styles).toEqual({ excludes: ['Thrash'] });
	});

	/*
	 * An empty list is not the same as no list: the resolver reads a missing
	 * field as "says nothing" and an empty one as "matches nothing".
	 */
	it('drops an enum criterion with no values instead of sending an empty list', () => {
		const form = emptyCriteriaForm();

		form.styles = { operator: 'excludes', values: [] };

		expect(toCriteria(form)).toEqual({});
	});
});

describe('toCriteriaForm', () => {
	it('finds which operator the criterion was written with', () => {
		expect(
			toCriteriaForm({ styles: { includesAll: ['Thrash', 'Death'] } })
				.styles
		).toEqual({ operator: 'includesAll', values: ['Thrash', 'Death'] });
	});

	it('reads a single year into both bounds', () => {
		const form = toCriteriaForm({ years: { equals: 1988 } });

		expect([form.yearFrom, form.yearTo]).toEqual([1988, 1988]);
	});

	it('survives a definition with no rule', () => {
		expect(toCriteriaForm({})).toEqual(emptyCriteriaForm());
	});

	it('round-trips a credits criterion through its two fields', () => {
		const credits = { musicians: ['hoglan'], roles: ['Drums'] };
		const form = toCriteriaForm({ credits });

		expect([form.creditMusicians, form.creditRoles]).toEqual([
			['hoglan'],
			['Drums'],
		]);
		expect(toCriteria(form).credits).toEqual(credits);
	});

	it('writes only the half of the credits criterion that is filled in', () => {
		const form = emptyCriteriaForm();

		form.creditRoles = ['Producer'];

		expect(toCriteria(form).credits).toEqual({ roles: ['Producer'] });
	});
});

describe('toDraft', () => {
	it('turns the empty fields into null, not into empty strings', () => {
		const draft = toDraft({
			...emptyCollectionForm(),
			name: '1988 Bay Area Thrash',
		});

		expect(draft).toMatchObject({
			name: '1988 Bay Area Thrash',
			slug: '1988-bay-area-thrash',
			description: null,
			icon: null,
			badge: null,
			parentUid: null,
			status: 'draft',
		});
	});

	it('keeps the badge only when it is named', () => {
		const named = toDraft({
			...emptyCollectionForm(),
			name: 'Collection',
			badgeName: 'Thrash Historian',
			badgeIcon: 'pi pi-star',
		});
		const unnamed = toDraft({
			...emptyCollectionForm(),
			name: 'Collection',
			badgeIcon: 'pi pi-star',
		});

		expect(named.badge).toEqual({
			name: 'Thrash Historian',
			description: null,
			icon: 'pi pi-star',
			artworkUrl: null,
		});
		expect(unnamed.badge).toBeNull();
	});
});

describe('toForm', () => {
	it('round-trips a definition through the editor', () => {
		const original = collection({
			description: 'The 1988 Bay Area scene.',
			criteria: {
				years: { from: 1988, to: 1988 },
				styles: { includesAny: ['Bay Area Thrash'] },
			},
			badge: {
				name: 'Thrash Historian',
				description: null,
				icon: null,
				artworkUrl: null,
			},
		});

		expect(toDraft(toForm(original))).toEqual({
			name: original.name,
			slug: original.slug,
			description: original.description,
			coverImageUrl: null,
			icon: null,
			criteria: original.criteria,
			badge: original.badge,
			basePoints: null,
			parentUid: null,
			status: original.status,
			visibility: original.visibility,
		});
	});
});

describe('describeCriteria', () => {
	/**
	 * The words come from the dictionary now, so the test brings its own:
	 * asserting on English wording here would break every time the wording
	 * is improved, and say nothing about the summary being put together
	 * right. This one stands in for the dictionary and shows the shape.
	 */
	const t = (key: string, params: Record<string, unknown> = {}) =>
		({
			'admin.criterion.albumStyles': 'Album styles',
			'admin.summary.artists': `${params['count']} artist(s)`,
			'admin.summary.musicians': `${params['count']} musician(s)`,
			'admin.summary.credited': `credited: ${params['credited']}`,
			'admin.summary.as': ' as ',
			'admin.summary.noRule': 'No rule — matches the whole catalog',
		})[key] ?? '';

	it('says in one line what the rule asks for', () => {
		expect(
			describeCriteria(
				{
					years: { from: 1980, to: 1989 },
					styles: { includesAny: ['Thrash'] },
					artists: { includesAny: ['a', 'b'] },
				},
				t
			)
		).toBe('1980–1989 · album styles Thrash · 2 artist(s)');
	});

	it('names who must be credited, and in what role', () => {
		expect(
			describeCriteria(
				{ credits: { musicians: ['hoglan'], roles: ['Drums'] } },
				t
			)
		).toBe('credited: 1 musician(s) as Drums');
	});

	it('warns when the rule catches everything', () => {
		expect(describeCriteria({}, t)).toMatch(/whole catalog/);
	});
});

describe('toRows', () => {
	it('orders by name and names the parent', () => {
		const resolution = (
			uid: string,
			name: string,
			total: number,
			parentUid: string | null = null
		): MusicCollectionResolution => ({
			collection: collection({ uid, name, parentUid }),
			resolved: {
				collectionUid: uid,
				criteriaVersion: 1,
				albums: [],
				total,
				calculatedAt: 0,
			},
		});
		const rows = toRows(
			[
				resolution('child', 'Bay Area', 6, 'parent'),
				resolution('parent', 'American Thrash', 40),
			],
			() => ''
		);

		expect(
			rows.map(({ name, total, parentName }) => [name, total, parentName])
		).toEqual([
			['American Thrash', 40, null],
			['Bay Area', 6, 'American Thrash'],
		]);
	});
});
