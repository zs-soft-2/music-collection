import Anthropic from '@anthropic-ai/sdk';

import { PhotoSignals, VisionError, readPhotoSignals } from './photo-signals';

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

const apiError = (status: number) =>
	new Anthropic.APIError(status, undefined, 'overloaded', undefined);

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
		const response = {
			stop_reason: 'end_turn',
			content: [{ type: 'text', text: JSON.stringify(signals) }],
		};

		await expect(
			readPhotoSignals(photo, client(response))
		).resolves.toEqual(signals);
	});

	it('a túlterhelt modellt újrapróbálhatónak jelöli', async () => {
		const error = await readPhotoSignals(
			photo,
			client(() => {
				throw apiError(529);
			})
		).catch((caught) => caught);

		expect(error).toBeInstanceOf(VisionError);
		expect((error as VisionError).retryable).toBe(true);
	});

	it('a 400-at nem — azon egy újraküldés nem segít', async () => {
		const error = await readPhotoSignals(
			photo,
			client(() => {
				throw apiError(400);
			})
		).catch((caught) => caught);

		expect((error as VisionError).retryable).toBe(false);
	});

	it('az értelmezhetetlen választ sem', async () => {
		const error = await readPhotoSignals(
			photo,
			client({
				stop_reason: 'end_turn',
				content: [{ type: 'text', text: 'nem JSON' }],
			})
		).catch((caught) => caught);

		expect(error).toBeInstanceOf(VisionError);
		expect((error as VisionError).retryable).toBe(false);
	});
});
