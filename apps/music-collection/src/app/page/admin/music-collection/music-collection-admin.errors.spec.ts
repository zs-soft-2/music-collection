import {
	describeDrawError,
	describeWriteError,
} from './music-collection-admin.errors';

/** Ahogy a callable hibája a kliensre érkezik. */
function failure(
	code: string,
	message: string,
	details?: Record<string, unknown>
): Error {
	return Object.assign(new Error(message), { code, details });
}

describe('describeWriteError', () => {
	it('a validálás mondatát a szerverről veszi', () => {
		expect(
			describeWriteError(
				failure('functions/invalid-argument', 'A slug foglalt.')
			)
		).toBe('A slug foglalt.');
	});

	/**
	 * Ami `internal`, abból a legtöbb olyasmi, amivel az admin nem tud kezdeni
	 * semmit — ott a kész mondat a jobb. Hogy ez egy *rajzolásnál* mégis
	 * kevés, arról a `describeDrawError` szól.
	 */
	it('az internal hibát egy kész mondatra cseréli', () => {
		expect(
			describeWriteError(
				failure('functions/internal', 'A gateway nem válaszolt: …')
			)
		).toBe('The image model refused the request. Try again later.');
	});
});

describe('describeDrawError', () => {
	/**
	 * Ez a mondat volt eddig elérhetetlen: a szerver tudta, mit felelt a
	 * modell, a felület viszont a kész szöveget írta ki helyette, és a padon
	 * álló ember a modellváltásban kereste a megoldást.
	 */
	it('ahol a szerver okot küldött, a saját mondata megy ki', () => {
		expect(
			describeDrawError(
				failure(
					'functions/internal',
					'A gateway kép helyett szöveget adott: nem rajzolom meg.',
					{ reason: 'no-image', model: 'valami-image' }
				)
			)
		).toStrictEqual({
			message: 'A gateway kép helyett szöveget adott: nem rajzolom meg.',
			reason: 'no-image',
		});
	});

	it('a gateway elutasítását is továbbadja', () => {
		expect(
			describeDrawError(
				failure(
					'functions/internal',
					'A gateway a képet nem rajzolta meg (quota): elfogyott.',
					{ reason: 'gateway-error' }
				)
			).reason
		).toBe('gateway-error');
	});

	/** Ok nélkül marad a régi út: egy ismeretlen hiba nem lesz beszédesebb. */
	it('ok nélkül az általános mondatot adja', () => {
		expect(
			describeDrawError(failure('functions/internal', 'valami baj'))
		).toStrictEqual({
			message: 'The image model refused the request. Try again later.',
			reason: null,
		});
	});

	it('a napi keret kimerülését a saját mondatával mondja', () => {
		expect(
			describeDrawError(
				failure('functions/resource-exhausted', 'elfogyott')
			).message
		).toBe("Today's badge allowance is used up.");
	});
});
