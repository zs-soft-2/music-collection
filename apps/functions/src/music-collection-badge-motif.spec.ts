import { GatewayClient } from './gateway-client';
import {
	MotifError,
	acceptMotif,
	describeBrief,
	writeBadgeMotif,
} from './music-collection-badge-motif';

const BRIEF = {
	collectionName: 'Megadeth — Studio Albums',
	artistNames: ['Megadeth'],
	styles: ['Thrash'],
	albums: [
		{ name: 'Rust in Peace', year: 1990 },
		{ name: 'Countdown to Extinction', year: 1992 },
	],
};

/** Egy gateway, ami a megadott szövegeket adja vissza, sorban. */
function fakeClient(texts: string[]): GatewayClient & { calls: number } {
	let calls = 0;
	const client = {
		get calls(): number {
			return calls;
		},
		execute: jest.fn(async () => {
			const text = texts[calls] ?? texts[texts.length - 1];

			calls += 1;

			return {
				kind: 'result' as const,
				executionId: 'exec',
				status: 'succeeded' as const,
				capability: 'text.complete' as const,
				model: 'valamelyik-modell',
				output: { text },
			};
		}),
	};

	return client as unknown as GatewayClient & { calls: number };
}

describe('a brief', () => {
	it('a lemezeket évszámostul sorolja fel', () => {
		expect(describeBrief(BRIEF)).toContain('- Rust in Peace (1990)');
	});

	it('kimondja, ha a szabály nem nevez meg előadót', () => {
		expect(
			describeBrief({ ...BRIEF, artistNames: [], styles: [] })
		).toContain('not named by the rule');
	});
});

describe('a motívum elfogadása', () => {
	it('átenged egy megönthető tárgyat', () => {
		expect(
			acceptMotif('a snapped olive branch bound in barbed wire', [
				'Megadeth',
			])
		).toBe('a snapped olive branch bound in barbed wire');
	});

	it('levágja a mondatvégi pontot és a fölös szóközt', () => {
		expect(acceptMotif('  a  cracked   anvil.  ', [])).toBe(
			'a cracked anvil'
		);
	});

	it('elutasítja a feliratot hívó szavakat', () => {
		for (const bad of [
			'a shield bearing the band logo',
			'an iron plate with lettering',
			'a banner carrying a slogan',
		]) {
			expect(acceptMotif(bad, [])).toBeNull();
		}
	});

	it('elutasítja az előadó nevét', () => {
		expect(
			acceptMotif('a skull wearing Megadeth colours', ['Megadeth'])
		).toBeNull();
	});

	it('elutasítja, ami nem tárgyként kezdődik', () => {
		expect(acceptMotif('the pin shows a skull', [])).toBeNull();
	});

	it('elutasítja a számot és az idézőjelet', () => {
		expect(acceptMotif('a skull over 2 crossed bones', [])).toBeNull();
		expect(acceptMotif('a skull called "the judge"', [])).toBeNull();
	});

	it('elutasítja a túl rövidet és a túl hosszút', () => {
		expect(acceptMotif('a skull', [])).toBeNull();
		expect(acceptMotif(`a ${'very '.repeat(20)}long thing`, [])).toBeNull();
	});

	it('nem fogad el nem szöveget', () => {
		expect(acceptMotif(undefined, [])).toBeNull();
		expect(acceptMotif(42, [])).toBeNull();
	});
});

describe('a motívum megíratása', () => {
	it('visszaadja a tárgyat és a modellt', async () => {
		const client = fakeClient([
			JSON.stringify({
				motif: 'a snapped olive branch over a bent nail',
			}),
		]);

		await expect(writeBadgeMotif(client, BRIEF)).resolves.toEqual({
			motif: 'a snapped olive branch over a bent nail',
			model: 'valamelyik-modell',
		});
		expect(client.calls).toBe(1);
	});

	it('újrakérdez, ha az első válasz a szűrőn elbukott', async () => {
		const client = fakeClient([
			JSON.stringify({ motif: 'a shield with the band logo' }),
			JSON.stringify({ motif: 'a snapped olive branch' }),
		]);

		await expect(writeBadgeMotif(client, BRIEF)).resolves.toMatchObject({
			motif: 'a snapped olive branch',
		});
		expect(client.calls).toBe(2);
	});

	it('megáll, ha a modell kétszer sem ad megönthetőt', async () => {
		// Szándékosan hangos: az `ai` szint csendes visszaesése a táblázatra
		// pontosan az a látszat-kontextus, ami ellen ez készült.
		const client = fakeClient([JSON.stringify({ motif: 'the logo' })]);

		await expect(writeBadgeMotif(client, BRIEF)).rejects.toBeInstanceOf(
			MotifError
		);
		expect(client.calls).toBe(2);
	});

	it('megáll az értelmezhetetlen válaszon is', async () => {
		const client = fakeClient(['nem JSON']);

		await expect(writeBadgeMotif(client, BRIEF)).rejects.toBeInstanceOf(
			MotifError
		);
	});

	it('a gateway hibáját sem nyeli el', async () => {
		const client = {
			execute: jest.fn(async () => {
				throw new Error('a gateway elzárkózott');
			}),
		} as unknown as GatewayClient;

		await expect(writeBadgeMotif(client, BRIEF)).rejects.toBeInstanceOf(
			MotifError
		);
	});
});
