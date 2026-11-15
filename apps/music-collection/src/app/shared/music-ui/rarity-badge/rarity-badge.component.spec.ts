import { TestBed } from '@angular/core/testing';
import { provideI18nTesting } from '@music-collection/core/i18n/testing';

import {
	RarityBadgeComponent,
	RarityBadgeRelease,
	toRarityBadge,
} from './rarity-badge.component';

const rated = (
	rarity: Partial<NonNullable<RarityBadgeRelease['rarity']>>
): RarityBadgeRelease => ({
	rarity: {
		tier: 'rare',
		source: 'discogs',
		have: 214,
		calculatedAt: 0,
		...rarity,
	},
});

describe('toRarityBadge', () => {
	it('reads the tier, its multiplier and where it came from', () => {
		expect(toRarityBadge(rated({}))).toMatchObject({
			tier: 'rare',
			factor: 1.6,
			source: 'discogs',
			have: 214,
		});
	});

	it('calls a pressing nobody has weighed yet common, and says it is pending', () => {
		expect(toRarityBadge({})).toMatchObject({
			tier: 'common',
			factor: 1,
			source: 'pending',
		});
	});

	it('calls a generic copy common whatever it carries', () => {
		expect(
			toRarityBadge({ ...rated({ tier: 'ultraRare' }), generic: true })
		).toMatchObject({ tier: 'common', source: 'generic' });
	});

	it('carries the curator’s reason', () => {
		expect(
			toRarityBadge({
				...rated({ tier: 'veryRare', source: 'manual' }),
				rarityOverride: {
					tier: 'veryRare',
					note: 'Test pressing',
					byUserId: 'curator',
					at: 0,
				},
			})
		).toMatchObject({ source: 'manual', note: 'Test pressing' });
	});
});

describe('RarityBadgeComponent', () => {
	it('shows the tier and the reason under it', async () => {
		await TestBed.configureTestingModule({
			imports: [RarityBadgeComponent],
			providers: [provideI18nTesting()],
		}).compileComponents();

		const fixture = TestBed.createComponent(RarityBadgeComponent);

		fixture.componentRef.setInput('release', rated({}));
		fixture.detectChanges();

		const page = fixture.nativeElement as HTMLElement;

		expect(page.querySelector('.tier')?.getAttribute('data-tier')).toBe(
			'rare'
		);
		expect(page.querySelector('.factor')?.textContent).toContain('1.6');
		expect(page.querySelector('.why')?.textContent?.trim()).not.toBe('');
	});
});
