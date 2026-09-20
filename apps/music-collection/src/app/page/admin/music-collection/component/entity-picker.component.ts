import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
	signal,
} from '@angular/core';

export interface PickerOption {
	uid: string;
	name: string;
}

/** Matches offered at once; the search narrows down to the rest. */
const MATCH_LIMIT = 12;

/**
 * Picks entities by name out of a list too long to scroll — the catalog has
 * thousands of musicians, so the search comes first and what is already
 * picked stays visible as chips.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-entity-picker',
	template: `
		@if (chips().length) {
			<ul class="chips">
				@for (chip of chips(); track chip.uid) {
					<li>
						<button
							type="button"
							class="chip"
							[attr.aria-label]="'Remove ' + chip.name"
							(click)="remove(chip.uid)"
						>
							{{ chip.name }}
							<span aria-hidden="true">×</span>
						</button>
					</li>
				}
			</ul>
		}

		<input
			type="search"
			[id]="inputId()"
			[placeholder]="placeholder()"
			[value]="query()"
			(input)="onQuery($event)"
		/>

		@if (query().trim()) {
			@if (matches().length) {
				<ul class="matches">
					@for (match of matches(); track match.uid) {
						<li>
							<button type="button" (click)="add(match.uid)">
								{{ match.name }}
							</button>
						</li>
					}
				</ul>
			} @else {
				<p class="none">Nothing matches “{{ query() }}”.</p>
			}
		}
	`,
	styles: `
		:host {
			display: flex;
			flex-direction: column;
			gap: 0.4rem;
		}

		.chips,
		.matches {
			display: flex;
			flex-wrap: wrap;
			gap: 0.35rem;
			margin: 0;
			padding: 0;
			list-style: none;
		}

		.matches {
			flex-direction: column;
			max-height: 12rem;
			overflow-y: auto;
			border: 1px solid var(--mc-border);
			border-radius: var(--mc-radius-md);

			button {
				width: 100%;
				padding: 0.35rem 0.6rem;
				font: inherit;
				font-size: 0.85rem;
				text-align: left;
				color: var(--mc-text);
				cursor: pointer;
				background: transparent;
				border: 0;

				&:hover,
				&:focus-visible {
					background: var(--mc-card-bg-hover);
				}
			}
		}

		.chip {
			display: inline-flex;
			align-items: center;
			gap: 0.35rem;
			padding: 0.2rem 0.6rem;
			font: inherit;
			font-size: 0.8rem;
			color: var(--mc-text);
			cursor: pointer;
			background: var(--mc-surface-2);
			border: 1px solid var(--mc-border-strong);
			border-radius: 999px;

			&:hover {
				border-color: var(--mc-primary);
			}
		}

		input {
			padding: 0.45rem 0.6rem;
			font: inherit;
			font-size: 0.9rem;
			color: var(--mc-text);
			background: var(--mc-bg);
			border: 1px solid var(--mc-border-strong);
			border-radius: var(--mc-radius-md);
		}

		.none {
			margin: 0;
			font-size: 0.8rem;
			color: var(--mc-text-subtle);
		}
	`,
})
export class EntityPickerComponent {
	public readonly options = input.required<PickerOption[]>();
	public readonly selected = input.required<string[]>();
	public readonly inputId = input('');
	public readonly placeholder = input('Search…');
	public readonly selectedChange = output<string[]>();

	protected readonly query = signal('');

	protected readonly chips = computed<PickerOption[]>(() => {
		const names = new Map(
			this.options().map((option) => [option.uid, option.name])
		);

		return this.selected().map((uid) => ({
			uid,
			name: names.get(uid) ?? uid,
		}));
	});

	protected readonly matches = computed<PickerOption[]>(() => {
		const query = this.query().trim().toLowerCase();

		if (!query) {
			return [];
		}

		const selected = new Set(this.selected());
		const matches: PickerOption[] = [];

		for (const option of this.options()) {
			if (
				!selected.has(option.uid) &&
				option.name.toLowerCase().includes(query)
			) {
				matches.push(option);

				if (matches.length === MATCH_LIMIT) {
					break;
				}
			}
		}

		return matches;
	});

	protected onQuery(event: Event): void {
		this.query.set((event.target as HTMLInputElement).value);
	}

	protected add(uid: string): void {
		this.selectedChange.emit([...this.selected(), uid]);
		this.query.set('');
	}

	protected remove(uid: string): void {
		this.selectedChange.emit(
			this.selected().filter((selected) => selected !== uid)
		);
	}
}
