import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { EntityTypeEnum, MediaEnum } from '@music-collection/api';

import { ReleaseUtilServiceImpl } from './release-util.service.impl';

describe('ReleaseUtilServiceImpl', () => {
	let service: ReleaseUtilServiceImpl;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideI18nTesting(), ReleaseUtilServiceImpl],
		});
		service = TestBed.inject(ReleaseUtilServiceImpl);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	/*
	 * The catalog number and the Discogs pressing are what a loaded pressing
	 * brings with it; a form that holds them and an entity that drops them
	 * would lose both on the first save.
	 */
	it('writes the pressing the form holds, number and source included', () => {
		const formGroup = service.createOrUpdateFormGroupForDisabling(
			undefined as unknown as FormGroup,
			undefined,
			false,
			true
		);

		formGroup.patchValue({
			album: { uid: 'album-1', name: 'The Legacy' },
			artist: {
				uid: 'artist-1',
				name: 'Testament',
				entityType: EntityTypeEnum.Artist,
			},
			catno: 'MOVLP2620',
			discogsReleaseId: 100,
			media: MediaEnum.vinyl,
			name: 'The Legacy',
		});

		expect(service.createEntity(formGroup)).toMatchObject({
			catno: 'MOVLP2620',
			discogsReleaseId: 100,
		});
	});

	it('keeps a run size as a whole number of copies, or not at all', () => {
		const formGroup = service.createOrUpdateFormGroupForDisabling(
			undefined as unknown as FormGroup,
			undefined,
			false,
			true
		);
		const sized = (editionSize: unknown) => {
			formGroup.patchValue({
				artist: { uid: 'artist-1', name: 'Testament' },
				editionSize,
			});

			return service.createEntity(formGroup).editionSize;
		};

		expect(sized(500)).toBe(500);
		// A number input hands its value over as text.
		expect(sized('500')).toBe(500);
		expect(sized('')).toBeNull();
		expect(sized(0)).toBeNull();
		expect(sized(12.5)).toBeNull();
		expect(sized(1_000_001)).toBeNull();
		expect(service.updateEntity(formGroup).editionSize).toBeNull();
	});

	it('never sends the rarity the server worked out back to it', () => {
		const model = service.convertEntityToModel({
			uid: 'pressing',
			name: 'The Legacy',
			date: new Date('1987-04-21'),
			rarity: {
				tier: 'rare',
				source: 'discogs',
				have: 214,
				calculatedAt: 0,
			},
			rarityOverride: { tier: 'rare', note: 'x', byUserId: 'c', at: 0 },
		} as never);

		expect(model).not.toHaveProperty('rarity');
		expect(model).not.toHaveProperty('rarityOverride');
	});

	it('clears a catalog number the admin emptied', () => {
		const formGroup = service.createOrUpdateFormGroupForDisabling(
			undefined as unknown as FormGroup,
			undefined,
			false,
			true
		);

		formGroup.patchValue({
			artist: { uid: 'artist-1', name: 'Testament' },
			catno: '',
		});

		expect(service.createEntity(formGroup).catno).toBeNull();
	});

	/*
	 * The shelf hands the sleeve colour straight to CSS, so what is saved
	 * has to be one shape: `#rrggbb` in lower case, or nothing at all.
	 */
	it('writes the sleeve colour in the one shape the shelf can draw', () => {
		const formGroup = service.createOrUpdateFormGroupForDisabling(
			undefined as unknown as FormGroup,
			undefined,
			false,
			true
		);

		formGroup.patchValue({
			artist: { uid: 'artist-1', name: 'Testament' },
			coverColor: '#B30F0F',
		});

		expect(service.createEntity(formGroup).coverColor).toBe('#b30f0f');

		formGroup.patchValue({ coverColor: '#f00' });

		expect(service.createEntity(formGroup).coverColor).toBe('#ff0000');
	});

	it('leaves a pressing nobody has described without a colour', () => {
		const formGroup = service.createOrUpdateFormGroupForDisabling(
			undefined as unknown as FormGroup,
			undefined,
			false,
			true
		);

		formGroup.patchValue({
			artist: { uid: 'artist-1', name: 'Testament' },
		});

		expect(service.updateEntity(formGroup).coverColor).toBeNull();

		/* Nothing a browser could paint with is not a colour. */
		formGroup.patchValue({ coverColor: 'crimson' });

		expect(service.updateEntity(formGroup).coverColor).toBeNull();
	});
});
