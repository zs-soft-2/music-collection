import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
	BADGE_STYLE_VERSION,
	BadgePromptInput,
	MOTIF_BY_STYLE,
	buildBadgePrompt,
	enamelOf,
	motifOf,
	patinaOf,
	rimOf,
	seedOf,
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

describe('a motívumtábla', () => {
	it('a katalógus minden stílusát ismeri', () => {
		const styles = catalogStyles();

		expect(styles.length).toBeGreaterThan(40);
		expect(styles.filter((style) => !MOTIF_BY_STYLE[style])).toEqual([]);
	});

	it('nem ad két stílusnak ugyanazt a motívumot', () => {
		const motifs = Object.values(MOTIF_BY_STYLE);

		expect(new Set(motifs).size).toBe(motifs.length);
	});

	it('inkább visszaesik, mint hogy pin nélkül hagyjon egy collectiont', () => {
		expect(motifOf([])).toContain('vinyl record');
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
		expect(buildBadgePrompt(input(), NOW).prompt).toContain(
			'a screaming skull wreathed in flames'
		);
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

describe('a seed', () => {
	it('ugyanaz marad ugyanarra a collectionre, így a badge újraelőállítható', () => {
		expect(seedOf('thrash-big-four')).toBe(seedOf('thrash-big-four'));
	});

	it('collectiononként más', () => {
		expect(seedOf('thrash-big-four')).not.toBe(seedOf('prog-69-75'));
	});
});
