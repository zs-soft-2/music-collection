import { Observable, of, throwError } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { SceneProbeResult } from '@music-collection/domain/music-collection/api';
import { MusicCollectionEffect } from '@music-collection/domain/music-collection/core';

import { CollectionImageEffect } from '../../../../../data/collection-image';
import { SceneGeneratorStore } from './scene-generator.store';

const RESULT: SceneProbeResult = {
	images: ['data:image/png;base64,AAAA'],
	dropped: 0,
	prompt: 'a dark shelf',
	negativePrompt: '',
	draft: 'none',
	size: '1536x864',
	requestedModel: null,
	model: 'gemini-3.1-flash-image',
};

/** Amit a gateway kép nélküli válaszából a szerver küld. */
function refusal(): Error {
	return Object.assign(
		new Error('A gateway egyetlen képet sem adott vissza (valami-image).'),
		{
			code: 'functions/internal',
			details: { reason: 'no-image', model: 'valami-image' },
		}
	);
}

interface FakeEffect {
	probeScene$: jest.Mock<Observable<SceneProbeResult>>;
}

function setUp(probe: FakeEffect['probeScene$']): {
	effect: FakeEffect;
	store: InstanceType<typeof SceneGeneratorStore>;
} {
	const effect: FakeEffect = { probeScene$: probe };

	TestBed.resetTestingModule();
	TestBed.configureTestingModule({
		providers: [
			SceneGeneratorStore,
			{ provide: MusicCollectionEffect, useValue: effect },
			{ provide: CollectionImageEffect, useValue: {} },
		],
	});

	const store = TestBed.inject(SceneGeneratorStore);

	store.set({ subject: 'a dark shelf' });

	return { effect, store };
}

beforeEach(() =>
	jest.spyOn(console, 'error').mockImplementation(() => undefined)
);

describe('SceneGeneratorStore', () => {
	/**
	 * Ez a teszt a lényeg. A `tapResponse` a külső pipe-on `EMPTY`-vel zárta
	 * a forrást, és azzal magát az rxMethodot: az első elhasalt rajzolás után
	 * a gomb aktív maradt, de nem indított semmit — se másik modellel, se
	 * másik szöveggel. Hiba nélkül ez a teszt is zöld, ezért a hiba *után*
	 * kér egy második rajzolást.
	 */
	it('egy elhasalt rajzolás után a következő elindul', () => {
		const probe = jest
			.fn<Observable<SceneProbeResult>>()
			.mockReturnValueOnce(throwError(() => refusal()))
			.mockReturnValueOnce(of(RESULT));
		const { store } = setUp(probe);

		store.run();

		expect(store.error()).not.toBeNull();
		expect(store.isProbing()).toBe(false);

		store.run();

		expect(probe).toHaveBeenCalledTimes(2);
		expect(store.result()).toEqual(RESULT);
	});

	/**
	 * A szerver pontosan tudja, mi jött vissza a gatewaytől; az admin
	 * felülete viszont minden `internal` hibát egy kész mondatra cserél. Ami
	 * okot hoz magával, annak a mondata a felhasználóé.
	 */
	it('a szerver mondatát és okát mutatja, nem az általános hibát', () => {
		const { store } = setUp(
			jest
				.fn<Observable<SceneProbeResult>>()
				.mockReturnValue(throwError(() => refusal()))
		);

		store.run();

		expect(store.error()).toContain('egyetlen képet sem adott vissza');
		expect(store.errorReason()).toBe('no-image');
	});

	/** Az új rajzolás az előző panaszával a képernyőn nem indulhat el. */
	it('az új rajzolás leszedi az előző hibáját', () => {
		const { store } = setUp(
			jest
				.fn<Observable<SceneProbeResult>>()
				.mockReturnValueOnce(throwError(() => refusal()))
				.mockReturnValueOnce(of(RESULT))
		);

		store.run();
		store.run();

		expect(store.error()).toBeNull();
		expect(store.errorReason()).toBeNull();
	});
});
