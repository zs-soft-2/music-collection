import {
	DiscogsMasterCandidate,
	DiscogsVersion,
	EntityTypeEnum,
	FormatDescriptionEnum,
	LabelEntity,
	MediaEnum,
	ReleaseCountryEnum,
} from '@music-collection/api';

import {
	countryOptions,
	pickMasterId,
	toCountry,
	toExternalPressing,
	toFormatDescriptions,
	toMedia,
} from './release-discogs.mapper';

const candidate = (
	fields: Partial<DiscogsMasterCandidate> = {}
): DiscogsMasterCandidate => ({
	masterId: 1,
	name: 'The Legacy',
	artistName: 'Testament',
	year: 1987,
	thumbUrl: null,
	...fields,
});

const version = (fields: Partial<DiscogsVersion> = {}): DiscogsVersion => ({
	id: 100,
	title: 'The Legacy',
	format: 'LP, Album, Reissue, 180 Gram',
	majorFormats: ['Vinyl'],
	label: 'Music On Vinyl',
	catno: 'MOVLP2620',
	country: 'Europe',
	year: 2019,
	thumbUrl: null,
	...fields,
});

const label = (name: string): LabelEntity =>
	({
		uid: `label-${name}`,
		entityType: EntityTypeEnum.Label,
		name,
	}) as LabelEntity;

describe('pickMasterId', () => {
	it('takes the hit whose artist and title both match', () => {
		const hit = pickMasterId('Testament', 'The Legacy', [
			candidate({ masterId: 9, name: 'The Legacy Tribute' }),
			candidate({ masterId: 7, artistName: 'Other Band' }),
			candidate({ masterId: 3 }),
		]);

		expect(hit).toBe(3);
	});

	it('takes the earliest of several masters of the same album', () => {
		const hit = pickMasterId('Testament', 'The Legacy', [
			candidate({ masterId: 8, year: 2017 }),
			candidate({ masterId: 3, year: 1987 }),
		]);

		expect(hit).toBe(3);
	});

	it('answers null where nothing was searched or nothing matched', () => {
		expect(pickMasterId('Testament', 'The Legacy', undefined)).toBeNull();
		expect(
			pickMasterId('Testament', 'The Legacy', [
				candidate({ name: 'Practice What You Preach' }),
			])
		).toBeNull();
	});
});

describe('toMedia', () => {
	it('reads the carrier Discogs names', () => {
		expect(toMedia(version())).toBe(MediaEnum.vinyl);
	});

	/*
	 * A box set is the packaging and Discogs often lists it first; the record
	 * inside it is what the catalog files the pressing under.
	 */
	it('passes over the box set where a carrier is also named', () => {
		expect(toMedia(version({ majorFormats: ['Box Set', 'Vinyl'] }))).toBe(
			MediaEnum.vinyl
		);
	});

	it('takes the box set where nothing more concrete is named', () => {
		expect(
			toMedia(version({ majorFormats: ['Box Set'], format: null }))
		).toBe(MediaEnum.boxset);
	});

	it('answers null for a carrier the catalog has no media for', () => {
		expect(
			toMedia(version({ majorFormats: ['File'], format: 'FLAC' }))
		).toBeNull();
	});
});

describe('toFormatDescriptions', () => {
	it('keeps the descriptions the catalog knows, in its own order', () => {
		expect(toFormatDescriptions(version())).toEqual([
			FormatDescriptionEnum.g180,
			FormatDescriptionEnum.reissue,
		]);
	});

	it('names each description once', () => {
		expect(
			toFormatDescriptions(
				version({
					majorFormats: ['Vinyl', 'Box Set'],
					format: 'LP, Box Set',
				})
			)
		).toEqual([FormatDescriptionEnum.boxSet]);
	});
});

describe('toCountry', () => {
	it('answers with the spelling the catalog uses where it has one', () => {
		expect(toCountry(version({ country: 'europe' }))).toBe(
			ReleaseCountryEnum.Europe
		);
	});

	/*
	 * The list the form offers is four countries long and pressings come
	 * from everywhere; the Discogs text is kept rather than dropped.
	 */
	it('keeps a country the list has never held', () => {
		expect(toCountry(version({ country: 'Germany' }))).toBe('Germany');
	});

	it('answers null where Discogs names none', () => {
		expect(toCountry(version({ country: null }))).toBeNull();
	});
});

describe('countryOptions', () => {
	it('offers the catalog list plus whatever is actually in hand', () => {
		expect(countryOptions('Germany', null)).toEqual([
			ReleaseCountryEnum.Argentina,
			ReleaseCountryEnum.Europe,
			ReleaseCountryEnum.New_Zealand,
			ReleaseCountryEnum.UK_Europe,
			'Germany',
		]);
	});

	it('does not repeat one the list already has', () => {
		expect(countryOptions('Europe')).toHaveLength(4);
	});
});

describe('toExternalPressing', () => {
	it('reads the pressing as the form holds its fields', () => {
		const pressing = toExternalPressing(version(), [
			label('Music On Vinyl'),
		]);

		expect(pressing).toEqual({
			catno: 'MOVLP2620',
			country: ReleaseCountryEnum.Europe,
			date: new Date(2019, 0, 1),
			discogsReleaseId: 100,
			formatDescription: [
				FormatDescriptionEnum.g180,
				FormatDescriptionEnum.reissue,
			],
			label: label('Music On Vinyl'),
			labelName: 'Music On Vinyl',
			media: MediaEnum.vinyl,
			name: 'The Legacy',
		});
	});

	/*
	 * Discogs numbers same-named labels, the catalog does not; the two are
	 * compared the way the catalog compares its own names.
	 */
	it('matches the label the catalog spells its own way', () => {
		const pressing = toExternalPressing(
			version({ label: 'Megaforce (2)' }),
			[label('Megaforce')]
		);

		expect(pressing.label?.name).toBe('Megaforce');
	});

	it('reports a label the catalog does not have instead of guessing', () => {
		const pressing = toExternalPressing(version(), [label('Atlantic')]);

		expect(pressing.label).toBeNull();
		expect(pressing.labelName).toBe('Music On Vinyl');
	});

	it('leaves an undated pressing undated', () => {
		expect(toExternalPressing(version({ year: null }), []).date).toBeNull();
	});
});
