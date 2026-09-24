import Anthropic from '@anthropic-ai/sdk';

import { VisionError } from './photo-signals';
import {
	ShelfSpine,
	mergeShelfReads,
	pairSpines,
	parseShelfRead,
	readShelfSignals,
} from './shelf-signals';

const photo = { data: 'AAAA', mediaType: 'image/jpeg' } as const;

/** A modell helyett: a megadott választ adja, vagy a megadott hibát dobja. */
function client(response: unknown | (() => never)): Anthropic {
	return {
		beta: {
			messages: {
				create: async () =>
					typeof response === 'function'
						? (response as () => never)()
						: response,
			},
		},
	} as unknown as Anthropic;
}

/** Egy gerinc, csak a teszt szempontjából érdekes mezőkkel. */
const spine = (overrides: Partial<ShelfSpine> = {}): ShelfSpine => ({
	position: 1,
	unreadable: false,
	artist: null,
	albumTitle: null,
	label: null,
	catalogNumber: null,
	barcode: null,
	media: 'vinyl',
	country: null,
	year: null,
	confidence: 'high',
	...overrides,
});

const katatonia = (title: string, catalogNumber: string | null = null) =>
	spine({ artist: 'Katatonia', albumTitle: title, catalogNumber });

describe('parseShelfRead', () => {
	it('a pozíciókat a sorrend szerint újraszámozza', () => {
		const read = parseShelfRead({
			spineCount: 3,
			spines: [
				{ position: 7, albumTitle: 'Obsidian' },
				{ position: 2, albumTitle: 'Tragic Idol' },
				{ position: 4, albumTitle: 'At the Mill' },
			],
		});

		expect(
			read.spines.map((item) => [item.position, item.albumTitle])
		).toEqual([
			[1, 'Tragic Idol'],
			[2, 'At the Mill'],
			[3, 'Obsidian'],
		]);
	});

	it('gerincszám híján a sorok számát adja', () => {
		expect(parseShelfRead({ spines: [{}, {}] }).spineCount).toBe(2);
	});

	it('megtartja a gerincszámot, ha több, mint amennyi sor van', () => {
		// Ez az eset a riasztás: a modell tízet lát, kilencet ír le.
		expect(parseShelfRead({ spineCount: 10, spines: [{}] })).toMatchObject({
			spineCount: 10,
			spines: [{ unreadable: false }],
		});
	});
});

describe('readShelfSignals', () => {
	it('a modell válaszát gerincekké alakítja', async () => {
		const response = {
			stop_reason: 'end_turn',
			content: [
				{
					type: 'text',
					text: JSON.stringify({
						spineCount: 1,
						spines: [
							{
								position: 1,
								unreadable: false,
								artist: 'Katatonia',
								albumTitle: 'City Burials',
								label: 'Peaceville',
								catalogNumber: 'VILELP76',
								barcode: '0801056876010',
								media: 'vinyl',
								country: 'UK',
								year: 2020,
								confidence: 'high',
							},
						],
					}),
				},
			],
		};

		await expect(
			readShelfSignals(photo, client(response))
		).resolves.toEqual({
			spineCount: 1,
			spines: [
				expect.objectContaining({
					albumTitle: 'City Burials',
					catalogNumber: 'VILELP76',
					barcode: '0801056876010',
				}),
			],
		});
	});

	it('a túlterhelt modellt újrapróbálhatónak jelöli', async () => {
		const error = await readShelfSignals(
			photo,
			client(() => {
				throw new Anthropic.APIError(
					529,
					undefined,
					'overloaded',
					undefined
				);
			})
		).catch((caught: VisionError) => caught);

		expect(error).toBeInstanceOf(VisionError);
		expect((error as VisionError).retryable).toBe(true);
	});
});

describe('pairSpines', () => {
	it('a kihagyott gerincet nem csúsztatja el mögötte a többit', () => {
		const left = [
			katatonia('The Fall of Hearts'),
			katatonia('City Burials'),
			katatonia('Dead End Kings'),
		];
		// A középső gerincet a második fotón takarja az előtte álló lemez.
		const right = [
			katatonia('The Fall of Hearts'),
			katatonia('Dead End Kings'),
		];

		expect(
			pairSpines(left, right).map(([a, b]) => [
				a?.albumTitle ?? null,
				b?.albumTitle ?? null,
			])
		).toEqual([
			['The Fall of Hearts', 'The Fall of Hearts'],
			['City Burials', null],
			['Dead End Kings', 'Dead End Kings'],
		]);
	});

	it('a katalógusszám akkor is párosít, ha a címet csak az egyik olvasta', () => {
		const left = [spine({ catalogNumber: 'VILELP566' })];
		const right = [katatonia('The Great Cold Distance', 'VILE LP 566')];

		expect(pairSpines(left, right)).toHaveLength(1);
		expect(pairSpines(left, right)[0][1]?.albumTitle).toBe(
			'The Great Cold Distance'
		);
	});
});

describe('mergeShelfReads', () => {
	const read = (spines: ShelfSpine[]) => ({
		spineCount: spines.length,
		spines,
	});

	it('egy fotóból konfliktus nélküli sorokat ad', () => {
		const merged = mergeShelfReads([read([katatonia('City Burials')])]);

		expect(merged.spines).toEqual([
			expect.objectContaining({ conflicts: [], seenOn: 1 }),
		]);
	});

	it('az eltérő katalógusszámot konfliktusnak jelöli', () => {
		const merged = mergeShelfReads([
			read([katatonia('Obsidian', 'MOVLP2621')]),
			read([katatonia('Obsidian', 'MOVLP2023')]),
		]);

		expect(merged.spines[0]).toMatchObject({
			catalogNumber: 'MOVLP2621',
			conflicts: ['catalogNumber'],
			alternatives: { catalogNumber: 'MOVLP2023' },
			confidence: 'low',
			seenOn: 2,
		});
	});

	it('a tagolásban eltérő katalógusszám nem konfliktus', () => {
		const merged = mergeShelfReads([
			read([katatonia('The Great Cold Distance', 'VILELP566')]),
			read([katatonia('The Great Cold Distance', 'VILE LP 566')]),
		]);

		expect(merged.spines[0].conflicts).toEqual([]);
	});

	it('a másik fotó kitölti, amit az egyik nem látott', () => {
		const merged = mergeShelfReads([
			read([katatonia('Obsidian')]),
			read([katatonia('Obsidian', 'MOVLP2620')]),
		]);

		expect(merged.spines[0]).toMatchObject({
			catalogNumber: 'MOVLP2620',
			conflicts: [],
		});
	});

	it('az egyetértés emeli, a konfliktus leviszi a bizalmat', () => {
		const agreed = mergeShelfReads([
			read([spine({ albumTitle: 'Obsidian', confidence: 'low' })]),
			read([spine({ albumTitle: 'Obsidian', confidence: 'low' })]),
		]);

		expect(agreed.spines[0].confidence).toBe('medium');

		const disputed = mergeShelfReads([
			read([spine({ albumTitle: 'Obsidian', year: 2020 })]),
			read([spine({ albumTitle: 'Obsidian', year: 2021 })]),
		]);

		expect(disputed.spines[0].confidence).toBe('low');
	});

	it('a csak az egyik fotón látszó gerincet megtartja', () => {
		const merged = mergeShelfReads([
			read([katatonia('The Fall of Hearts'), katatonia('City Burials')]),
			read([katatonia('The Fall of Hearts')]),
		]);

		expect(
			merged.spines.map((item) => [item.albumTitle, item.seenOn])
		).toEqual([
			['The Fall of Hearts', 2],
			['City Burials', 1],
		]);
	});

	it('az olvashatatlan gerinc sor marad, és megtartja a gerincszámokat', () => {
		const merged = mergeShelfReads([
			{
				spineCount: 2,
				spines: [
					katatonia('City Burials'),
					spine({ unreadable: true }),
				],
			},
			{ spineCount: 3, spines: [katatonia('City Burials')] },
		]);

		expect(merged.spines).toHaveLength(2);
		expect(merged.spines[1].unreadable).toBe(true);
		// A hívó ebből látja, hogy az egyik fotón eggyel több gerinc volt.
		expect(merged.spineCounts).toEqual([2, 3]);
	});
});
