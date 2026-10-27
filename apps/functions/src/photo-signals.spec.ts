import { ZsAiError } from '@zssz-soft/zs-ai-sdk';

import { PhotoSignals, readPhotoSignals } from './photo-signals';
import { VisionClient, VisionError } from './vision-client';

const photo = { data: 'AAAA', mediaType: 'image/jpeg' } as const;

/** A gateway sikeres szöveges válasza. */
const reply = (text: string) => ({
	kind: 'result' as const,
	executionId: 'req-1',
	status: 'succeeded' as const,
	capability: 'text.complete' as const,
	output: { text },
});

/**
 * A gateway helyett: soronként egy válasz vagy hiba, a hívások sorrendjében.
 * A `requests` a kapott kéréseket gyűjti.
 */
function client(...answers: (string | ZsAiError)[]) {
	const requests: unknown[] = [];
	const fake: VisionClient = {
		execute: async (request) => {
			requests.push(request);
			const answer =
				answers[Math.min(requests.length, answers.length) - 1];

			if (answer instanceof ZsAiError) throw answer;

			return reply(answer);
		},
	};

	return Object.assign(fake, { requests });
}

const gatewayError = (status: number, code: string) =>
	new ZsAiError('gateway', code, status);

const signals: PhotoSignals = {
	artist: 'Exodus',
	albumTitle: 'Bonded by Blood',
	label: 'Torrid Records',
	catalogNumber: 'TRLP-1969',
	barcode: null,
	media: 'vinyl',
	country: 'US',
	year: 1985,
	confidence: 'high',
};

describe('readPhotoSignals', () => {
	it('a modell válaszát jelekké alakítja', async () => {
		await expect(
			readPhotoSignals(photo, client(JSON.stringify(signals)))
		).resolves.toEqual(signals);
	});

	it('a képet, a sémát és a modellt a gateway szerződése szerint küldi', async () => {
		const fake = client(JSON.stringify(signals));

		await readPhotoSignals(photo, fake);

		expect(fake.requests).toEqual([
			{
				capability: 'text.complete',
				input: expect.objectContaining({
					model: 'claude-opus-5',
					images: [{ base64: 'AAAA', mimeType: 'image/jpeg' }],
					responseSchema: expect.objectContaining({
						name: 'photo_signals',
					}),
				}),
			},
		]);
	});

	it('a túlterhelt szolgáltatót egyszer újrapróbálja', async () => {
		const fake = client(
			gatewayError(503, 'PROVIDER_ERROR'),
			JSON.stringify(signals)
		);

		await expect(readPhotoSignals(photo, fake)).resolves.toEqual(signals);
		expect(fake.requests).toHaveLength(2);
	});

	it('ha a második próba is elakad, újrapróbálhatónak jelöli', async () => {
		const fake = client(gatewayError(503, 'PROVIDER_ERROR'));
		const error = await readPhotoSignals(photo, fake).catch(
			(caught) => caught
		);

		expect(error).toBeInstanceOf(VisionError);
		expect((error as VisionError).retryable).toBe(true);
		expect(fake.requests).toHaveLength(2);
	});

	it('a 400-at nem — azon egy újraküldés nem segít', async () => {
		const fake = client(gatewayError(400, 'BAD_REQUEST'));
		const error = await readPhotoSignals(photo, fake).catch(
			(caught) => caught
		);

		expect((error as VisionError).retryable).toBe(false);
		expect(fake.requests).toHaveLength(1);
	});

	it('az elfogyott gateway-keretet sem — az nem múlik el magától', async () => {
		const error = await readPhotoSignals(
			photo,
			client(gatewayError(429, 'OVER_QUOTA'))
		).catch((caught) => caught);

		expect((error as VisionError).retryable).toBe(false);
	});

	it('az elzárkózást nem fizeti ki kétszer', async () => {
		const fake = client(gatewayError(502, 'STRUCTURED_OUTPUT_INVALID'));
		const error = await readPhotoSignals(photo, fake).catch(
			(caught) => caught
		);

		expect(error).toBeInstanceOf(VisionError);
		expect((error as VisionError).retryable).toBe(false);
		expect(fake.requests).toHaveLength(1);
	});

	it('az értelmezhetetlen választ sem', async () => {
		const error = await readPhotoSignals(photo, client('nem JSON')).catch(
			(caught) => caught
		);

		expect(error).toBeInstanceOf(VisionError);
		expect((error as VisionError).retryable).toBe(false);
	});
});
