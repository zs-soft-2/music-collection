import { FormatEnum, StyleEnum } from '../../../common';
import {
	toCatalogStyle,
	toCatalogStyles,
	toDiscogsAlbumFormat,
	toDiscogsFormat,
} from './external-mapping';

describe('toCatalogStyle', () => {
	it('matches however the source spells the style', () => {
		expect(toCatalogStyle('Thrash')).toBe(StyleEnum.Thrash);
		expect(toCatalogStyle('thrash metal')).toBe(StyleEnum.Thrash);
		expect(toCatalogStyle('Thrash Metal')).toBe(StyleEnum.Thrash);
	});

	it('is null for a style the catalog does not know', () => {
		expect(toCatalogStyle('Bossa Nova')).toBeNull();
	});
});

describe('toCatalogStyles', () => {
	it('keeps the source order and drops what it does not know', () => {
		expect(toCatalogStyles(['Trip Hop', 'Thrash', 'Death Metal'])).toEqual([
			StyleEnum.Thrash,
			StyleEnum.Death,
		]);
	});

	it('names each style once', () => {
		expect(toCatalogStyles(['Thrash', 'Thrash Metal'])).toEqual([
			StyleEnum.Thrash,
		]);
	});
});

describe('toDiscogsFormat', () => {
	it('reads the release description, not the carrier', () => {
		expect(toDiscogsFormat(['Vinyl', 'LP', 'Album'])).toBe(FormatEnum.lp);
		expect(toDiscogsFormat(['Vinyl', '12"', 'EP'])).toBe(FormatEnum.ep);
		expect(toDiscogsFormat(['CD', 'Compilation'])).toBe(
			FormatEnum.compilation
		);
		expect(toDiscogsFormat(['Vinyl', '7"', 'Single'])).toBe(
			FormatEnum.single
		);
	});

	it('is null where Discogs says nothing about the format', () => {
		expect(toDiscogsFormat([])).toBeNull();
		expect(toDiscogsFormat(['Vinyl'])).toBeNull();
	});
});

describe('toDiscogsAlbumFormat', () => {
	it('takes an undated discography entry for an LP', () => {
		expect(toDiscogsAlbumFormat([], 'The Legacy')).toBe(FormatEnum.lp);
	});

	it('reads an EP off the title when Discogs gives no format', () => {
		expect(toDiscogsAlbumFormat([], 'Return Of The Darkness EP')).toBe(
			FormatEnum.ep
		);
		expect(toDiscogsAlbumFormat([], 'Demo E.P.')).toBe(FormatEnum.ep);
	});

	it('lets the format Discogs does give win over the title', () => {
		expect(toDiscogsAlbumFormat(['LP', 'Album'], 'Something EP')).toBe(
			FormatEnum.lp
		);
	});
});
