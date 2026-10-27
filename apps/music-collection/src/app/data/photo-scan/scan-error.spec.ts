import { scanQuotaMessage } from './scan-error';

/** A callable error as `@angular/fire` hands it over. */
const failure = (code: string, source?: string) => ({
	code,
	...(source ? { details: { source } } : {}),
});

describe('scanQuotaMessage', () => {
	it('speaks up when the collector has spent their day', () => {
		expect(
			scanQuotaMessage(failure('functions/resource-exhausted', 'quota'))
		).toContain('allowance');
	});

	it('says it is off when scanning is switched off', () => {
		expect(
			scanQuotaMessage(failure('functions/failed-precondition', 'quota'))
		).toContain('switched off');
	});

	/**
	 * The point of the `source`: a busy Discogs and a busy model arrive under
	 * the same code, and for those the collector should try again — so they
	 * must not read that their day is over.
	 */
	it('leaves a busy service to the page', () => {
		expect(
			scanQuotaMessage(failure('functions/resource-exhausted', 'discogs'))
		).toBeNull();
		expect(
			scanQuotaMessage(failure('functions/resource-exhausted', 'vision'))
		).toBeNull();
		expect(scanQuotaMessage(failure('functions/internal'))).toBeNull();
	});

	it('survives an error that is not one of ours', () => {
		expect(scanQuotaMessage(null)).toBeNull();
		expect(scanQuotaMessage(new Error('offline'))).toBeNull();
	});
});
