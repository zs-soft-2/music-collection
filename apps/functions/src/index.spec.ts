/**
 * A pénzbe kerülő callable-ök védelme.
 *
 * Az `identifyRecordFromPhoto` minden hívása egy Anthropic vision kérés és
 * több Discogs keresés — tehát pénz. A jogosultság-ellenőrzés önmagában nem
 * elég hozzá: egy Firebase ID token a böngészőből kimásolható, és onnantól a
 * végpont a mi appunk nélkül, scriptből is hívható, akárhányszor. Ezt csak az
 * App Check fogja meg: a token azt igazolja, hogy a hívás a mi appunkból jön.
 *
 * A teszt ezért HTTP-kérésként hívja a callable-t: az App Check ellenőrzése a
 * firebase-functions burkában van, a `.run()` pont azt a réteget kerülné meg.
 */

import { identifyRecordFromPhoto } from './index';

/** A `security/users/{uid}/effective_permissions` olvasásai — ez a mi kódunk
 * első lépése, tehát ebből látszik, eljutott-e a kérés a függvényünkig. */
const mockPermissionReads: string[] = [];

jest.mock('firebase-admin/app', () => ({
	initializeApp: jest.fn(),
	getApp: jest.fn(() => ({ name: 'test' })),
	applicationDefault: jest.fn(),
}));

jest.mock('firebase-admin/auth', () => ({
	getAuth: () => ({
		verifyIdToken: async (token: string) => {
			if (token !== 'collector-token') throw new Error('invalid token');

			return { uid: 'collector-1' };
		},
	}),
}));

jest.mock('firebase-admin/app-check', () => ({
	getAppCheck: () => ({
		verifyToken: async (token: string) => {
			if (token !== 'app-check-token') throw new Error('invalid token');

			return { appId: 'music-collection', token: {} };
		},
	}),
}));

jest.mock('firebase-admin/firestore', () => ({
	FieldValue: { serverTimestamp: () => 'now' },
	getFirestore: () => ({
		doc: (path: string) => ({
			get: async () => {
				mockPermissionReads.push(path);

				return {
					data: () => ({
						permissions: ['createCollectionItemEntity'],
					}),
				};
			},
		}),
	}),
}));

interface CallResult {
	status: number;
	/** A callable válasza: `{ result }` vagy `{ error: { status, message } }`. */
	body: { error?: { status?: string; message?: string }; result?: unknown };
}

/** A callable meghívása HTTP-kérésként, a megadott fejlécekkel. */
function callIdentify(headers: Record<string, string>): Promise<CallResult> {
	const lowercased = Object.fromEntries(
		Object.entries(headers).map(([key, value]) => [
			key.toLowerCase(),
			value,
		])
	);
	const request = {
		method: 'POST',
		originalUrl: '/identifyRecordFromPhoto',
		headers: { 'content-type': 'application/json', ...lowercased },
		header(name: string): string | undefined {
			return (this.headers as Record<string, string>)[name.toLowerCase()];
		},
		get(name: string): string | undefined {
			return this.header(name);
		},
		// Se kép, se vonalkód: ha a kérés eljut a függvényünkig, az a
		// jogosultság-olvasás UTÁN akad el, `invalid-argument`-tel.
		body: { data: {} },
	};
	const result: CallResult = { status: 200, body: {} };
	const response = {
		headers: {} as Record<string, string>,
		setHeader(name: string, value: string) {
			this.headers[name] = value;

			return this;
		},
		getHeader(name: string) {
			return this.headers[name];
		},
		removeHeader(name: string) {
			delete this.headers[name];

			return this;
		},
		status(code: number) {
			result.status = code;

			return this;
		},
		send(payload: CallResult['body']) {
			result.body = payload;

			return this;
		},
		write: () => true,
		end() {
			return this;
		},
		on: () => undefined,
	};
	const handler = identifyRecordFromPhoto as unknown as (
		request: unknown,
		response: unknown
	) => Promise<void>;

	return handler(request, response).then(() => result);
}

describe('identifyRecordFromPhoto — App Check', () => {
	beforeEach(() => {
		mockPermissionReads.length = 0;
	});

	it('nem futtatja le magát App Check token nélkül, hiába van ID token', async () => {
		const calls = [];

		for (let index = 0; index < 25; index += 1) {
			calls.push(
				await callIdentify({ authorization: 'Bearer collector-token' })
			);
		}

		// Ez a lényeg: a mi kódunk egyszer sem indult el. Enélkül a huszonöt
		// hívás huszonöt modell-kérés, a mi számlánkra.
		expect(mockPermissionReads).toEqual([]);
		expect(calls.map((call) => call.body.error?.status)).toEqual(
			new Array(25).fill('UNAUTHENTICATED')
		);
	});

	it('a saját appunk hívását átengedi', async () => {
		const call = await callIdentify({
			authorization: 'Bearer collector-token',
			'X-Firebase-AppCheck': 'app-check-token',
		});

		// Eljut a függvényünkig, és ott a hiányzó képre panaszkodik.
		expect(mockPermissionReads).toEqual([
			'security/users/collector-1/effective_permissions',
		]);
		expect(call.body.error?.status).toBe('INVALID_ARGUMENT');
	});
});
