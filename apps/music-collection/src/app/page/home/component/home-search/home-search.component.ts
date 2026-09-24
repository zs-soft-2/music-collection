import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
	output,
	signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { I18N_IMPORTS, TextService } from '@music-collection/core/i18n';

import { HomeSearchGroup, HomeSearchItem } from '../../home.mapper';

/**
 * Quick search of the home page (ARIA combobox): live results grouped by
 * artists, collected releases and catalog albums. Arrow keys move between
 * the results, Enter opens the active one — or the collection page filtered
 * by the query when no result is active.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-home-search',
	host: {
		'(focusout)': 'onFocusOut($event)',
	},
	imports: [...I18N_IMPORTS],
	template: `
		<ng-container *transloco="let t">
			<div class="search">
				<i class="pi pi-search" aria-hidden="true"></i>
				<label class="visually-hidden" for="home-search">{{
					t('home.search.label')
				}}</label>
				<input
					id="home-search"
					type="search"
					role="combobox"
					[placeholder]="t('home.search.placeholder')"
					autocomplete="off"
					aria-autocomplete="list"
					aria-controls="home-search-results"
					[attr.aria-expanded]="expanded()"
					[attr.aria-activedescendant]="activeItem()?.id ?? null"
					[value]="query()"
					(input)="onInput($event)"
					(focus)="open.set(true)"
					(keydown)="onKeydown($event)"
				/>
			</div>

			<div
				id="home-search-results"
				class="results"
				role="listbox"
				[attr.aria-label]="t('home.search.results')"
				[hidden]="!expanded()"
			>
				@for (group of results(); track group.kind) {
					<div
						class="group"
						role="group"
						[attr.aria-labelledby]="'home-search-' + group.kind"
					>
						<div
							class="group-label"
							[id]="'home-search-' + group.kind"
						>
							{{ t(group.labelKey) }}
						</div>
						@for (item of group.items; track item.id) {
							<!-- Combobox-minta: a billentyűzetet az input kezeli (aria-activedescendant), az opció nem fókuszálható. -->
							<!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
							<div
								class="option"
								role="option"
								[id]="item.id"
								[attr.aria-selected]="
									item.id === activeItem()?.id
								"
								(mousedown)="$event.preventDefault()"
								(click)="select(item)"
							>
								@if (item.imageUrl) {
									<img
										[src]="item.imageUrl"
										alt=""
										loading="lazy"
										[class.round]="item.kind === 'artist'"
									/>
								} @else {
									<span
										class="placeholder"
										[class.round]="item.kind === 'artist'"
										aria-hidden="true"
										>♪</span
									>
								}
								<span class="text">
									<span class="title">{{ item.title }}</span>
									@if (item.subtitle) {
										<span class="subtitle">{{
											item.subtitle
										}}</span>
									}
								</span>
							</div>
						}
					</div>
				} @empty {
					<p class="empty">{{ t('home.search.empty') }}</p>
				}

				<!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
				<div
					class="option all"
					role="option"
					id="home-search-all"
					[attr.aria-selected]="
						activeItem()?.id === 'home-search-all'
					"
					(mousedown)="$event.preventDefault()"
					(click)="searchCollection()"
				>
					<i class="pi pi-arrow-right" aria-hidden="true"></i>
					{{
						t('home.search.inCollection', { query: query().trim() })
					}}
				</div>
			</div>

			<p class="visually-hidden" aria-live="polite">
				{{ announcement() }}
			</p>
		</ng-container>
	`,
	styles: `
		:host {
			position: relative;
			display: block;
			max-width: 640px;
			margin: 0 auto 1.5rem;
		}

		.visually-hidden {
			position: absolute;
			width: 1px;
			height: 1px;
			margin: -1px;
			overflow: hidden;
			clip: rect(0 0 0 0);
			white-space: nowrap;
			border: 0;
		}

		.search {
			position: relative;

			i {
				position: absolute;
				top: 50%;
				left: 1rem;
				color: var(--mc-text-subtle);
				transform: translateY(-50%);
			}

			input {
				width: 100%;
				padding: 0.8rem 1rem 0.8rem 2.6rem;
				font: inherit;
				color: var(--mc-text);
				background: var(--mc-bg-muted);
				border: 1px solid var(--mc-border-strong);
				border-radius: var(--mc-radius-md);

				&::placeholder {
					color: var(--mc-text-subtle);
				}

				&:focus-visible {
					outline: 2px solid var(--mc-primary);
					outline-offset: 1px;
				}
			}
		}

		.results {
			position: absolute;
			top: calc(100% + 0.4rem);
			right: 0;
			left: 0;
			z-index: 40;
			max-height: min(70vh, 560px);
			overflow-y: auto;
			padding: 0.4rem;
			background: var(--mc-card-bg);
			border: 1px solid var(--mc-border-strong);
			border-radius: var(--mc-radius-md);
			box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);

			&[hidden] {
				display: none;
			}
		}

		.group + .group {
			margin-top: 0.25rem;
			padding-top: 0.25rem;
			border-top: 1px solid var(--mc-border);
		}

		.group-label {
			padding: 0.5rem 0.6rem 0.3rem;
			font-size: 0.7rem;
			font-weight: 700;
			letter-spacing: 0.12em;
			text-transform: uppercase;
			color: var(--mc-text-muted);
		}

		.option {
			display: flex;
			align-items: center;
			gap: 0.75rem;
			padding: 0.45rem 0.6rem;
			border-radius: var(--mc-radius-sm, 6px);
			cursor: pointer;

			&:hover,
			&[aria-selected='true'] {
				background: var(--mc-card-bg-hover);
			}

			&[aria-selected='true'] {
				outline: 2px solid var(--mc-primary);
				outline-offset: -2px;
			}

			img,
			.placeholder {
				flex: none;
				width: 40px;
				height: 40px;
				object-fit: cover;
				border-radius: 4px;
			}

			.placeholder {
				display: grid;
				place-items: center;
				color: var(--mc-text-subtle);
				background: var(--mc-surface-2);
			}

			.round {
				border-radius: 50%;
			}
		}

		.text {
			display: flex;
			flex-direction: column;
			min-width: 0;
		}

		.title,
		.subtitle {
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.title {
			font-weight: 600;
			color: var(--mc-text);
		}

		.subtitle {
			font-size: 0.8rem;
			color: var(--mc-text-muted);
		}

		.empty {
			margin: 0;
			padding: 0.8rem 0.6rem;
			color: var(--mc-text-muted);
		}

		.all {
			margin-top: 0.25rem;
			font-size: 0.85rem;
			font-weight: 600;
			color: var(--mc-accent);
			border-top: 1px solid var(--mc-border);
			border-radius: 0;
		}
	`,
})
export class HomeSearchComponent {
	private readonly router = inject(Router);

	public readonly query = input.required<string>();
	public readonly results = input.required<HomeSearchGroup[]>();
	public readonly queryChange = output<string>();

	protected readonly open = signal(false);
	private readonly activeIndex = signal(-1);

	/** Every option in display order; the last one searches the collection. */
	private readonly options = computed<Pick<HomeSearchItem, 'id'>[]>(() => [
		...this.results().flatMap((group) => group.items),
		{ id: 'home-search-all' },
	]);

	protected readonly expanded = computed(
		() => this.open() && this.query().trim() !== ''
	);

	protected readonly activeItem = computed(() =>
		this.expanded() ? (this.options()[this.activeIndex()] ?? null) : null
	);

	private readonly text = inject(TextService);

	protected readonly announcement = computed(() => {
		if (!this.expanded()) {
			return '';
		}

		// Read aloud, so it has to be a sentence in the reader's language and
		// not a number with an English word after it.
		return this.text.pluralizer()(
			'home.search.announcement',
			this.options().length - 1
		);
	});

	protected onInput(event: Event): void {
		this.activeIndex.set(-1);
		this.open.set(true);
		this.queryChange.emit((event.target as HTMLInputElement).value);
	}

	protected onKeydown(event: KeyboardEvent): void {
		const count = this.options().length;

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				this.open.set(true);
				this.activeIndex.update((index) => (index + 1) % count);
				break;
			case 'ArrowUp':
				event.preventDefault();
				this.open.set(true);
				this.activeIndex.update((index) =>
					index <= 0 ? count - 1 : index - 1
				);
				break;
			case 'Enter': {
				if (!this.query().trim()) {
					return;
				}
				event.preventDefault();
				const active = this.activeItem();
				const item = this.results()
					.flatMap((group) => group.items)
					.find((option) => option.id === active?.id);
				if (item) {
					this.select(item);
				} else {
					this.searchCollection();
				}
				break;
			}
			case 'Escape':
				if (this.expanded()) {
					event.preventDefault();
					this.close();
				} else if (this.query()) {
					this.queryChange.emit('');
				}
				break;
		}
	}

	protected onFocusOut(event: FocusEvent): void {
		const next = event.relatedTarget as Node | null;
		const host = event.currentTarget as HTMLElement;
		if (!next || !host.contains(next)) {
			this.close();
		}
	}

	protected select(item: HomeSearchItem): void {
		this.close();
		this.router.navigate(item.link);
	}

	protected searchCollection(): void {
		this.close();
		this.router.navigate(['/collection'], {
			queryParams: { q: this.query().trim() },
		});
	}

	private close(): void {
		this.open.set(false);
		this.activeIndex.set(-1);
	}
}
