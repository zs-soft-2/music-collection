import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
	BADGE_STYLE_VERSION,
	BadgePromptInput,
	MOTIFS_BY_STYLE,
	buildBadgePrompt,
	enamelOf,
	motifOf,
	patinaOf,
	rimOf,
	seedOf,
	styleNames,
} from './music-collection-badge-prompt';

/** 2026-09-21, hogy egy teszt se a naptártól függjön. */
const NOW = Date.UTC(2026, 8, 21);

/**
 * A functions app nem látja a libeket (saját `tsc`, `rootDir: src`), ezért a
 * stílusokat a forrásból olvassuk ki. Így a tábla nem tud csendben lemaradni
 * egy új stílusról: aki felveszi a `StyleEnum`-ba, itt bukik el, amíg nem ad
 * neki motívumot is.
 */
function catalogStyles(): string[] {
	const source = readFileSync(
		join(
			__dirname,
			'../../../libs/common/api/src/lib/music/genre/genre.enum.ts'
		),
		'utf8'
	);
	const block = source.slice(
		source.indexOf('export enum StyleEnum'),
		source.indexOf('export const StyleList')
	);

	return [...block.matchAll(/=\s*'([^']+)'/g)].map((match) => match[1]);
}

function input(overrides: Partial<BadgePromptInput> = {}): BadgePromptInput {
	return {
		styles: ['Thrash'],
		earliestYear: 1983,
		points: 480,
		isSingleArtist: false,
		slug: 'thrash-big-four',
		...overrides,
	};
}

/** Amennyi közül egy stílus választhat; ennyi alatt a polc ismételni kezd. */
const MOTIFS_PER_STYLE = 3;

describe('a motívumtábla', () => {
	it('a katalógus minden stílusát ismeri', () => {
		const styles = catalogStyles();

		expect(styles.length).toBeGreaterThan(40);
		expect(styles.filter((style) => !MOTIFS_BY_STYLE[style])).toEqual([]);
	});

	it('egy stílusra sem hagy egyetlen motívumot, mert abból nincs választás', () => {
		expect(
			Object.entries(MOTIFS_BY_STYLE).filter(
				([, motifs]) => motifs.length < MOTIFS_PER_STYLE
			)
		).toEqual([]);
	});

	it('egy motívumot sem ad ki kétszer, se stíluson belül, se azon kívül', () => {
		const motifs = Object.values(MOTIFS_BY_STYLE).flat();

		expect(new Set(motifs).size).toBe(motifs.length);
	});

	/**
	 * A gitár nem tiltott — a rock-oldali stílusoknak pont az a tárgya —, de
	 * a metalnak nem ez a nyelve. Ez a szám azért van itt, hogy a hangszer
	 * ne szivárogjon vissza a tábla többi részébe.
	 */
	it('a hangszert a rock-oldali stílusokra hagyja', () => {
		const instrument = /guitar|plectrum|bass|amplifier|drum/;
		const withInstrument = Object.values(MOTIFS_BY_STYLE)
			.flat()
			.filter((motif) => instrument.test(motif));

		expect(withInstrument.length).toBeLessThanOrEqual(6);
	});

	it('inkább visszaesik, mint hogy pin nélkül hagyjon egy collectiont', () => {
		expect(motifOf(['nincs ilyen stílus'], 0)).toBe(motifOf([], 0));
	});

	it('a visszaesés is a műfajról szól, nem akármelyik lemezről', () => {
		expect(motifOf([], 0)).toContain('skull');
	});
});

describe('a stíluszár', () => {
	it('ugyanaz a szöveg két collectionön, amikben semmi közös nincs', () => {
		const thrash = buildBadgePrompt(input(), NOW).prompt;
		const gothic = buildBadgePrompt(
			input({
				styles: ['Gothic'],
				earliestYear: 2019,
				points: 90,
				slug: 'gothic-revival',
			}),
			NOW
		).prompt;
		const lockOf = (prompt: string): [string, string] => [
			prompt.slice(0, prompt.indexOf('The pin is')),
			prompt.slice(prompt.indexOf(' Oxidised silver pewter')),
		];

		expect(lockOf(thrash)).toEqual(lockOf(gothic));
	});

	it('tiltja a feliratot, mert az elgépelt badge rosszabb a némánál', () => {
		expect(buildBadgePrompt(input(), NOW).negativePrompt).toContain('text');
	});

	it('feljegyzi, melyik verzió ellen készült', () => {
		expect(buildBadgePrompt(input(), NOW).styleVersion).toBe(
			BADGE_STYLE_VERSION
		);
	});
});

describe('amit a collection dönt el', () => {
	it('az elsőként megnevezett stílusból veszi a motívumot', () => {
		const { prompt } = buildBadgePrompt(input(), NOW);

		expect(
			MOTIFS_BY_STYLE['Thrash'].filter((motif) => prompt.includes(motif))
		).toHaveLength(1);
	});

	it('ugyanannak a collectionnek mindig ugyanazt a motívumot adja', () => {
		expect(motifOf(['Thrash'], seedOf('thrash-big-four'))).toBe(
			motifOf(['Thrash'], seedOf('thrash-big-four'))
		);
	});

	it('nem ítéli egy stílus minden collectionjét ugyanarra a pinre', () => {
		const slugs = ['thrash-big-four', 'teutonic-thrash', 'thrash-1983'];
		const motifs = slugs.map((slug) => motifOf(['Thrash'], seedOf(slug)));

		expect(new Set(motifs).size).toBeGreaterThan(1);
	});

	it('családonként csoportosítja a zománcot, hogy a műfaj sorozat legyen', () => {
		expect(enamelOf(['Thrash'])).toBe(enamelOf(['Teutonic Thrash']));
		expect(enamelOf(['Thrash'])).not.toBe(enamelOf(['Doom']));
	});

	it('a legrégebbi lemezhez koptatja a fémet, nem a mai naphoz', () => {
		expect(patinaOf(1983, NOW)).toContain('blackened antique');
		expect(patinaOf(2015, NOW)).toContain('bright polished nickel');
	});

	it('öregen hagyja a fémet, ha a katalógus nem tud évet', () => {
		expect(patinaOf(null, NOW)).toContain('aged pewter');
	});

	it('a pontokkal emeli a peremet', () => {
		expect(rimOf(480)).toContain('double stepped');
		expect(rimOf(300)).toContain('beaded');
		expect(rimOf(80)).toContain('plain');
	});

	it('az egyszerzős collectiont kivágja, nem korongot üt neki', () => {
		expect(
			buildBadgePrompt(input({ isSingleArtist: true }), NOW).prompt
		).toContain('die cut to the silhouette');
		expect(buildBadgePrompt(input(), NOW).prompt).toContain(
			'The pin is round'
		);
	});
});

/**
 * A badge egyszer négy pint rajzolt egy lemezjátszó-karral, mert a
 * collectiont az előadó tartotta össze, nem a stílus — a prompt viszont
 * egyetlen criteria-mezőt nézett meg. Ezek a tesztek arról szólnak, hogy egy
 * szabály melyik alakban is nevezi meg a műfaját.
 */
describe('a stílusok kiolvasása a szabályból', () => {
	it('a megnevezés sorrendjében adja őket, mert az első adja a motívumot', () => {
		expect(
			styleNames({
				styles: { includesAny: ['Thrash', 'Bay Area Thrash'] },
			})
		).toEqual(['Thrash', 'Bay Area Thrash']);
	});

	it('az includesAll ugyanúgy megnevezés, csak szigorúbb', () => {
		expect(styleNames({ styles: { includesAll: ['Doom'] } })).toEqual([
			'Doom',
		]);
	});

	it('az előadó stílusa is összetarthat egy collectiont', () => {
		expect(
			styleNames({ artistStyles: { includesAny: ['Heavy metal'] } })
		).toEqual(['Heavy metal']);
	});

	it('az album stílusa megelőzi az előadóét', () => {
		expect(
			styleNames({
				artistStyles: { includesAny: ['Heavy metal'] },
				styles: { includesAny: ['Speed'] },
			})
		).toEqual(['Speed', 'Heavy metal']);
	});

	it('üresen hagyja, amit semmilyen stílus nem nevez meg', () => {
		expect(
			styleNames({
				years: { from: 1970, to: 1979 },
				artists: { includesAny: ['VtIq9R7sFwP8mdNQy2s9'] },
			})
		).toEqual([]);
	});

	it('nem esik el attól, ha a szabály mást ír oda, mint egy lista', () => {
		expect(styleNames({})).toEqual([]);
		expect(styleNames({ styles: null })).toEqual([]);
		expect(styleNames({ styles: { includesAny: 'Thrash' } })).toEqual([]);
	});
});

describe('a seed', () => {
	it('ugyanaz marad ugyanarra a collectionre, így a badge újraelőállítható', () => {
		expect(seedOf('thrash-big-four')).toBe(seedOf('thrash-big-four'));
	});

	it('collectiononként más', () => {
		expect(seedOf('thrash-big-four')).not.toBe(seedOf('prog-69-75'));
	});
});
