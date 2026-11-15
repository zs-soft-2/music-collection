import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from '@angular/core';
import { ReleaseEntity } from '@music-collection/api';
import { RarityTier } from '@music-collection/common/api';
import { I18N_IMPORTS } from '@music-collection/core/i18n';
import { RARITY_FACTORS } from '@music-collection/domain/music-collection/engine';

/** What the page needs of a pressing to say how rare it is. */
export type RarityBadgeRelease = Pick<
	ReleaseEntity,
	'editionSize' | 'generic' | 'rarity' | 'rarityOverride'
>;

/** Where the tier came from, as the line under it says it. */
export type RarityBadgeSource =
	'generic' | 'pending' | 'manual' | 'edition' | 'discogs' | 'catalog';

export interface RarityBadgeView {
	tier: RarityTier;
	factor: number;
	source: RarityBadgeSource;
	have: number | null;
	editionSize: number | null;
	note: string | null;
}

/**
 * The tier of a pressing as a page shows it. A generic copy and a pressing
 * the server has not weighed yet are both common — but they are not the same
 * thing to read, and the line under the tier tells them apart.
 */
export function toRarityBadge(release: RarityBadgeRelease): RarityBadgeView {
	const tier = release.generic
		? 'common'
		: (release.rarity?.tier ?? 'common');

	return {
		tier,
		factor: RARITY_FACTORS[tier],
		source: release.generic
			? 'generic'
			: (release.rarity?.source ?? 'pending'),
		have: release.rarity?.have ?? null,
		editionSize: release.editionSize ?? null,
		note: release.rarityOverride?.note ?? null,
	};
}

/**
 * How rare a pressing is, and why the catalog says so.
 *
 * The reason is the point of showing it: a tier nobody can trace is a tier
 * nobody trusts, and the score of a collection hangs on it.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-rarity-badge',
	imports: [...I18N_IMPORTS],
	template: `
		@let item = view();

		<span class="tier" [attr.data-tier]="item.tier">
			{{ 'ui.collectionScore.rarity.' + item.tier | transloco }}
			<span class="factor">×{{ item.factor | mcNumber: '1.0-2' }}</span>
		</span>
		<span class="why">
			@switch (item.source) {
				@case ('discogs') {
					{{ item.have ?? 0 | mcPlural: 'ui.rarityBadge.discogs' }}
				}
				@case ('edition') {
					{{
						item.editionSize ?? 0
							| mcPlural: 'ui.rarityBadge.edition'
					}}
				}
				@case ('manual') {
					{{ 'ui.rarityBadge.manual' | transloco }}
					@if (item.note) {
						— {{ item.note }}
					}
				}
				@default {
					{{ 'ui.rarityBadge.' + item.source | transloco }}
				}
			}
		</span>
	`,
	styles: `
		:host {
			display: inline-flex;
			flex-wrap: wrap;
			align-items: baseline;
			gap: 0.2rem 0.6rem;
			font-size: 0.8rem;
		}

		.tier {
			display: inline-flex;
			align-items: baseline;
			gap: 0.35rem;
			font-weight: 700;
			color: var(--mc-text-muted);

			&::before {
				width: 0.55rem;
				height: 0.55rem;
				align-self: center;
				content: '';
				background: currentColor;
				border-radius: 50%;
			}

			&[data-tier='uncommon'] {
				color: var(--mc-status-ok);
			}

			&[data-tier='rare'] {
				color: var(--mc-info);
			}

			&[data-tier='veryRare'] {
				color: var(--mc-accent);
			}

			&[data-tier='ultraRare'] {
				color: var(--mc-primary);
			}
		}

		.factor {
			font-weight: 600;
			font-variant-numeric: tabular-nums;
		}

		.why {
			color: var(--mc-text-subtle);
		}
	`,
})
export class RarityBadgeComponent {
	public readonly release = input.required<RarityBadgeRelease>();

	protected readonly view = computed(() => toRarityBadge(this.release()));
}
