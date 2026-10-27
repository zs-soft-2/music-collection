import { Firestore } from 'firebase-admin/firestore';

import {
	DecideRequestInput,
	decideRequest,
	isSameValue,
} from './request-decision';

// ── Egy kis Firestore-utánzat, ami felírja, mit írtak rá ───────────────────
//
// Nem az adatért van: azért, hogy az ÍRÁSOKAT rögzítse. A kérdés minden
// esetben ugyanaz — mi került a katalógusba, és mi nem —, és arra csak az
// felel, ami látja, hova nyúlt a tranzakció.

interface Write {
	path: string;
	kind: 'set' | 'update';
	data: Record<string, unknown>;
}

function fakeDatabase(documents: Record<string, Record<string, unknown>>) {
	const writes: Write[] = [];
	let generated = 0;

	const reference = (path: string) => ({
		path,
		id: path.split('/').pop() ?? '',
		collection: (name: string) => collectionAt(`${path}/${name}`),
	});
	const collectionAt = (path: string) => ({
		doc: (id?: string) =>
			reference(`${path}/${id ?? `generated-${++generated}`}`),
	});
	const transaction = {
		get: async ({ path }: { path: string }) => ({
			exists: !!documents[path],
			data: () => documents[path],
			get: (field: string) => documents[path]?.[field],
		}),
		set: (
			{ path }: { path: string },
			data: Record<string, unknown>
		): void => {
			writes.push({ path, kind: 'set', data });
		},
		update: (
			{ path }: { path: string },
			data: Record<string, unknown>
		): void => {
			writes.push({ path, kind: 'update', data });
		},
	};
	const database = {
		collection: collectionAt,
		doc: (path: string) => reference(path),
		runTransaction: <T>(work: (held: typeof transaction) => Promise<T>) =>
			work(transaction),
	};

	return { database: database as unknown as Firestore, writes };
}

const REQUEST_PATH = 'entity-request/r1';

const band = {
	name: 'Pozvakowski',
	country: 'Hungary',
	description: 'A band the catalog has never heard of.',
	styles: ['Alternative Rock'],
};

/** Egy beküldött kérés, ahogy a gyűjtő oldala írja. */
const request = (fields: Record<string, unknown> = {}) => ({
	userId: 'collector-1',
	operation: 'create',
	target: {
		featureKey: 'artist',
		entityType: 'Artist',
		path: null,
		parentPath: null,
		ownedPath: 'user/collector-1/owned-artist/a1',
	},
	before: null,
	after: band,
	changes: [
		{ field: 'country', before: null, after: band.country },
		{ field: 'description', before: null, after: band.description },
		{ field: 'name', before: null, after: band.name },
		{ field: 'styles', before: null, after: band.styles },
	],
	status: 'pending',
	baseUpdatedAt: null,
	...fields,
});

const accept = (...fields: string[]) =>
	fields.map((field) => ({ field, kind: 'accepted' as const }));

const reject = (...fields: string[]) =>
	fields.map((field) => ({
		field,
		kind: 'rejected' as const,
		reason: 'Nincs mögötte forrás.',
	}));

const decide = (
	documents: Record<string, Record<string, unknown>>,
	input: Omit<DecideRequestInput, 'requestId'>
) => {
	const { database, writes } = fakeDatabase(documents);

	return {
		writes,
		result: decideRequest(
			database,
			{ requestId: 'r1', ...input },
			{ adminUid: 'admin-1' }
		),
	};
};

const written = (writes: Write[], match: string) =>
	writes.find((write) => write.path.startsWith(match));

describe('decideRequest: amit az admin elfogad', () => {
	it('felveszi a katalógusba, a katalógus tulajdonában', async () => {
		const { result, writes } = decide(
			{ [REQUEST_PATH]: request() },
			{
				verdicts: accept('country', 'description', 'name', 'styles'),
			}
		);

		await expect(result).resolves.toMatchObject({
			status: 'approved',
			appliedFields: ['country', 'description', 'name', 'styles'],
		});
		expect(written(writes, 'artist/')?.data).toMatchObject({
			...band,
			entityType: 'Artist',
			meta: { ownerId: 'GLOBAL' },
		});
	});

	it('a nevéből keresőmezőt is ír, különben a listákban nem találni meg', async () => {
		const { result, writes } = decide(
			{ [REQUEST_PATH]: request() },
			{
				verdicts: [
					...accept('name'),
					...reject('country', 'description', 'styles'),
				],
			}
		);

		await result;

		expect(written(writes, 'artist/')?.data['searchParameters']).toContain(
			'pozvakowski'
		);
	});

	it('csak az elfogadott mezőket viszi be', async () => {
		const { result, writes } = decide(
			{ [REQUEST_PATH]: request() },
			{
				verdicts: [
					...accept('name', 'country'),
					...reject('description', 'styles'),
				],
			}
		);

		await expect(result).resolves.toMatchObject({
			status: 'partially-approved',
			appliedFields: ['country', 'name'],
		});
		expect(written(writes, 'artist/')?.data).not.toHaveProperty(
			'description'
		);
	});

	it('megbökteti a katalógus verzióját, hogy a kliensek lássák', async () => {
		const { result, writes } = decide(
			{ [REQUEST_PATH]: request() },
			{ verdicts: accept('country', 'description', 'name', 'styles') }
		);

		await result;

		expect(
			Object.keys(
				(written(writes, 'sync/catalog')?.data['modifiedAt'] ??
					{}) as Record<string, unknown>
			)
		).toEqual(
			expect.arrayContaining([
				'artist',
				'entity-request',
				'entity-response',
			])
		);
	});
});

describe('decideRequest: a válasz', () => {
	it('annak szól, aki kérte, és megmondja, mi lett a mezőkkel', async () => {
		const { result, writes } = decide(
			{ [REQUEST_PATH]: request() },
			{
				verdicts: [
					...accept('name', 'country', 'styles'),
					...reject('description'),
				],
				adminNote: '  Köszönjük.  ',
			}
		);

		await result;

		const response = written(writes, 'entity-response/')?.data;

		expect(response).toMatchObject({
			requestUid: 'r1',
			userId: 'collector-1',
			status: 'partially-approved',
			adminNote: 'Köszönjük.',
			decidedBy: 'admin-1',
		});
		expect(response?.['verdicts']).toEqual([
			{ field: 'country', kind: 'accepted', reason: null },
			{
				field: 'description',
				kind: 'rejected',
				reason: 'Nincs mögötte forrás.',
			},
			{ field: 'name', kind: 'accepted', reason: null },
			{ field: 'styles', kind: 'accepted', reason: null },
		]);
	});

	it('a kérésre ráírja, hogy elbírálták, és melyik válasz felel rá', async () => {
		const { result, writes } = decide(
			{ [REQUEST_PATH]: request() },
			{ verdicts: reject('country', 'description', 'name', 'styles') }
		);

		await expect(result).resolves.toMatchObject({ status: 'rejected' });

		const decided = written(writes, REQUEST_PATH)?.data;

		expect(decided).toMatchObject({
			status: 'rejected',
			decidedBy: 'admin-1',
		});
		expect(decided?.['responseUid']).toBeTruthy();
	});

	it('elutasított kérésnél semmi nem kerül a katalógusba', async () => {
		const { result, writes } = decide(
			{ [REQUEST_PATH]: request() },
			{ verdicts: reject('country', 'description', 'name', 'styles') }
		);

		await result;

		expect(written(writes, 'artist/')).toBeUndefined();
		expect(written(writes, 'entity-response/')?.data).toMatchObject({
			appliedPath: null,
			appliedFields: [],
		});
	});
});

describe('decideRequest: amit nem enged', () => {
	it('az indoklás nélküli elutasítást', async () => {
		const { result } = decide(
			{ [REQUEST_PATH]: request() },
			{
				verdicts: [
					...accept('country', 'description', 'styles'),
					{ field: 'name', kind: 'rejected', reason: '   ' },
				],
			}
		);

		await expect(result).rejects.toThrow(/indokolni/);
	});

	it('a mezőt, amiről senki nem döntött', async () => {
		const { result } = decide(
			{ [REQUEST_PATH]: request() },
			{ verdicts: accept('name', 'country', 'styles') }
		);

		await expect(result).rejects.toThrow(/nem döntötte el/);
	});

	it('a döntést olyan mezőről, ami nincs a kérésben', async () => {
		const { result } = decide(
			{ [REQUEST_PATH]: request() },
			{
				verdicts: accept(
					'country',
					'description',
					'name',
					'styles',
					'members'
				),
			}
		);

		await expect(result).rejects.toThrow(/nincs a kérésben/);
	});

	it('a kétszer eldöntött mezőt', async () => {
		const { result } = decide(
			{ [REQUEST_PATH]: request() },
			{
				verdicts: [
					...accept(
						'country',
						'description',
						'name',
						'styles',
						'name'
					),
				],
			}
		);

		await expect(result).rejects.toThrow(/Két döntés/);
	});

	it('a már elbírált kérés újbóli elbírálását', async () => {
		const { result } = decide(
			{ [REQUEST_PATH]: request({ status: 'approved' }) },
			{ verdicts: accept('country', 'description', 'name', 'styles') }
		);

		await expect(result).rejects.toThrow(/már elbírálták/);
	});

	it('a nem létező kérést', async () => {
		const { result } = decide({}, { verdicts: accept('name') });

		await expect(result).rejects.toThrow(/Nincs ilyen kérés/);
	});

	it('az olyan mezőt, amit a katalógusba nem lehet írni', async () => {
		const { result } = decide(
			{
				[REQUEST_PATH]: request({
					after: { ...band, members: [{ uid: 'm1' }] },
					changes: [
						{ field: 'members', before: null, after: [] },
						{ field: 'name', before: null, after: band.name },
					],
				}),
			},
			{ verdicts: accept('members', 'name') }
		);

		await expect(result).rejects.toThrow(/nem lehet a katalógusba írni/);
	});

	it('az értéket, ami nem fér a mezőbe', async () => {
		const { result } = decide(
			{
				[REQUEST_PATH]: request({
					after: { ...band, artistType: 'orchestra' },
					changes: [
						{
							field: 'artistType',
							before: null,
							after: 'orchestra',
						},
					],
				}),
			},
			{ verdicts: accept('artistType') }
		);

		await expect(result).rejects.toThrow(/nem megfelelő/);
	});

	it('az új entitást a neve nélkül', async () => {
		const { result } = decide(
			{ [REQUEST_PATH]: request() },
			{
				verdicts: [
					...accept('country', 'description', 'styles'),
					...reject('name'),
				],
			}
		);

		await expect(result).rejects.toThrow(/nem lehet felvenni/);
	});

	it('az olyan entitást, amire szándékosan nincs séma (dokumentum)', async () => {
		const { result } = decide(
			{
				[REQUEST_PATH]: request({
					target: {
						featureKey: 'document',
						entityType: 'Document',
						path: null,
						parentPath: null,
						ownedPath: null,
					},
				}),
			},
			{ verdicts: accept('country', 'description', 'name', 'styles') }
		);

		await expect(result).rejects.toThrow(/még nem lehet kérést elbírálni/);
	});

	it('a szülőt, ami alá az entitás nem tartozhat', async () => {
		const { result } = decide(
			{
				[REQUEST_PATH]: request({
					target: {
						featureKey: 'artist',
						entityType: 'Artist',
						path: null,
						parentPath: 'artist/other',
						ownedPath: null,
					},
				}),
			},
			{ verdicts: accept('country', 'description', 'name', 'styles') }
		);

		await expect(result).rejects.toThrow(/gyökerében él/);
	});
});

describe('decideRequest: módosítási kérés', () => {
	const updateRequest = (fields: Record<string, unknown> = {}) =>
		request({
			operation: 'update',
			target: {
				featureKey: 'artist',
				entityType: 'Artist',
				path: 'artist/a1',
				parentPath: null,
				ownedPath: null,
			},
			before: { name: 'Pozvakowski', country: 'Hungary' },
			after: { name: 'Pozvakowski', country: 'Germany' },
			changes: [
				{ field: 'country', before: 'Hungary', after: 'Germany' },
			],
			...fields,
		});

	it('átírja a mezőt, amit az admin elfogadott', async () => {
		const { result, writes } = decide(
			{
				[REQUEST_PATH]: updateRequest(),
				'artist/a1': { name: 'Pozvakowski', country: 'Hungary' },
			},
			{ verdicts: accept('country') }
		);

		await expect(result).resolves.toMatchObject({
			status: 'approved',
			appliedPath: 'artist/a1',
		});
		expect(written(writes, 'artist/a1')).toMatchObject({
			kind: 'update',
			data: { country: 'Germany' },
		});
	});

	it('megáll, ha a katalógus időközben mást mond', async () => {
		const { result } = decide(
			{
				[REQUEST_PATH]: updateRequest(),
				'artist/a1': { name: 'Pozvakowski', country: 'Austria' },
			},
			{ verdicts: accept('country') }
		);

		await expect(result).rejects.toThrow(/időközben megváltozott/);
	});

	it('megáll, ha a dokumentum már nincs meg', async () => {
		const { result } = decide(
			{ [REQUEST_PATH]: updateRequest() },
			{ verdicts: accept('country') }
		);

		await expect(result).rejects.toThrow(/már nincs meg/);
	});

	it('a teljes elutasításhoz nem is nyúl a katalógushoz', async () => {
		const { result, writes } = decide(
			{ [REQUEST_PATH]: updateRequest() },
			{ verdicts: reject('country') }
		);

		await expect(result).resolves.toMatchObject({ status: 'rejected' });
		expect(written(writes, 'artist/a1')).toBeUndefined();
	});
});

describe('decideRequest: a többi entitás', () => {
	const under = (
		featureKey: string,
		entityType: string,
		parentPath: string | null,
		after: Record<string, unknown>,
		changes: string[]
	) =>
		request({
			target: {
				featureKey,
				entityType,
				path: null,
				parentPath,
				ownedPath: null,
			},
			after,
			changes: changes.map((field) => ({
				field,
				before: null,
				after: after[field],
			})),
		});

	it('az albumot az előadó alá veszi fel', async () => {
		const { result, writes } = decide(
			{
				[REQUEST_PATH]: under(
					'album',
					'Album',
					'artist/a1',
					{ name: 'Presence', year: 1976 },
					['name', 'year']
				),
			},
			{ verdicts: accept('name', 'year') }
		);

		await expect(result).resolves.toMatchObject({ status: 'approved' });
		expect(written(writes, 'artist/a1/album/')?.data).toMatchObject({
			name: 'Presence',
			year: 1976,
			entityType: 'Album',
		});
	});

	it('a kiadást az album alá', async () => {
		const { result, writes } = decide(
			{
				[REQUEST_PATH]: under(
					'release',
					'Release',
					'artist/a1/album/b1',
					{ name: 'Presence', media: 'vinyl', catno: 'SS 8416' },
					['name', 'media', 'catno']
				),
			},
			{ verdicts: accept('name', 'media', 'catno') }
		);

		await expect(result).resolves.toMatchObject({ status: 'approved' });
		expect(
			written(writes, 'artist/a1/album/b1/release/')?.data
		).toMatchObject({ catno: 'SS 8416', entityType: 'Release' });
	});

	it('nem enged olyan szülőt, ami alá az entitás nem tartozik', async () => {
		const { result } = decide(
			{
				[REQUEST_PATH]: under(
					'release',
					'Release',
					'artist/a1',
					{ name: 'Presence', media: 'vinyl' },
					['name', 'media']
				),
			},
			{ verdicts: accept('name', 'media') }
		);

		await expect(result).rejects.toThrow(/nem az, ami alá/);
	});

	it('a hordozó nélküli kiadást sem', async () => {
		const { result } = decide(
			{
				[REQUEST_PATH]: under(
					'release',
					'Release',
					'artist/a1/album/b1',
					{ name: 'Presence', media: 'vinyl' },
					['name', 'media']
				),
			},
			{ verdicts: [...accept('name'), ...reject('media')] }
		);

		await expect(result).rejects.toThrow(/nem lehet felvenni/);
	});

	it('a kiadót a katalógus gyökerébe', async () => {
		const { result, writes } = decide(
			{
				[REQUEST_PATH]: under(
					'label',
					'Label',
					null,
					{ name: 'Swan Song', discogsId: 1234 },
					['name', 'discogsId']
				),
			},
			{ verdicts: accept('name', 'discogsId') }
		);

		await expect(result).resolves.toMatchObject({ status: 'approved' });
		expect(written(writes, 'label/')?.data).toMatchObject({
			name: 'Swan Song',
			discogsId: 1234,
		});
	});

	it('a Discogs-blokkot nem engedi az albumon: az az importé', async () => {
		const { result } = decide(
			{
				[REQUEST_PATH]: under(
					'album',
					'Album',
					'artist/a1',
					{ name: 'Presence', discogs: { releaseId: 1 } },
					['name', 'discogs']
				),
			},
			{ verdicts: accept('name', 'discogs') }
		);

		await expect(result).rejects.toThrow(/nem lehet a katalógusba írni/);
	});

	it('a tagságot a zenészével együtt kéri', async () => {
		const { result, writes } = decide(
			{
				[REQUEST_PATH]: under(
					'membership',
					'Membership',
					null,
					{
						artistUid: 'a1',
						musicianUid: 'm1',
						musicianName: 'John Paul Jones',
						kind: 'member',
						instruments: ['Bass'],
					},
					[
						'artistUid',
						'musicianUid',
						'musicianName',
						'kind',
						'instruments',
					]
				),
			},
			{
				verdicts: accept(
					'artistUid',
					'musicianUid',
					'musicianName',
					'kind',
					'instruments'
				),
			}
		);

		await expect(result).resolves.toMatchObject({ status: 'approved' });
		expect(written(writes, 'membership/')?.data).toMatchObject({
			kind: 'member',
			instruments: ['Bass'],
		});
	});

	it('a nem létező tagsági fajtát nem', async () => {
		const { result } = decide(
			{
				[REQUEST_PATH]: under(
					'membership',
					'Membership',
					null,
					{
						artistUid: 'a1',
						musicianUid: 'm1',
						musicianName: 'John Paul Jones',
						kind: 'roadie',
					},
					['artistUid', 'musicianUid', 'musicianName', 'kind']
				),
			},
			{
				verdicts: accept(
					'artistUid',
					'musicianUid',
					'musicianName',
					'kind'
				),
			}
		);

		await expect(result).rejects.toThrow(/nem megfelelő/);
	});
});

describe('isSameValue', () => {
	it('minden ürességet egynek olvas', () => {
		expect(isSameValue(null, undefined)).toBe(true);
		expect(isSameValue('', [])).toBe(true);
		expect(isSameValue(null, 'Pozvakowski')).toBe(false);
	});

	it('a listát sorrendben, az objektumot mezőnként hasonlítja', () => {
		expect(isSameValue(['a', 'b'], ['a', 'b'])).toBe(true);
		expect(isSameValue(['a', 'b'], ['b', 'a'])).toBe(false);
		expect(isSameValue({ id: 1 }, { id: 1 })).toBe(true);
		expect(isSameValue({ id: 1 }, { id: 2 })).toBe(false);
	});
});
