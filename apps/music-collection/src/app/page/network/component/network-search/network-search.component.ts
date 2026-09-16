import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	linkedSignal,
	output,
	signal,
} from '@angular/core';

import { NETWORK_KIND_LABELS, NetworkSearchResult } from '../../network.model';

/**
 * Finds a musician or group to put in the focus (ARIA combobox). Arrow
 * keys move between the results, Enter picks the active one, Escape closes.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-network-search',
	host: {
		'(focusout)': 'onFocusOut($event)',
	},
	template: `
		<div class="search">
			<i class="pi pi-search" aria-hidden="true"></i>
			<label class="visually-hidden" for="network-search">
				Search the network
			</label>
			<input
				id="network-search"
				type="search"
				role="combobox"
				placeholder="Search the network…"
				autocomplete="off"
				aria-autocomplete="list"
				aria-controls="network-search-results"
				[attr.aria-expanded]="expanded()"
				[attr.aria-activedescendant]="
					expanded() && active() >= 0
						? 'network-search-' + active()
						: null
				"
				[value]="query()"
				(input)="onInput($event)"
				(focus)="open.set(true)"
				(keydown)="onKeydown($event)"
			/>
		</div>

		<ul
			id="network-search-results"
			class="results"
			role="listbox"
			aria-label="Search results"
			[hidden]="!expanded()"
		>
			@for (result of results(); track result.nodeId; let i = $index) {
				<li
					role="option"
					class="result"
					[id]="'network-search-' + i"
					[attr.aria-selected]="i === active()"
					[class.is-active]="i === active()"
					tabindex="-1"
					(mousedown)="$event.preventDefault()"
					(click)="pick(result)"
					(keydown.enter)="pick(result)"
				>
					<span class="name">{{ result.name }}</span>
					<span class="kind" [attr.data-kind]="result.kind">
						{{ kindLabels[result.kind] }}
					</span>
				</li>
			}
		</ul>
		<p class="visually-hidden" aria-live="polite">{{ status() }}</p>
	`,
	styles: `
		:host {
			position: relative;
			display: block;
		}

		.search {
			position: relative;

			i {
				position: absolute;
				top: 50%;
				left: 0.9rem;
				transform: translateY(-50%);
				color: var(--mc-text-subtle);
			}
		}

		input {
			box-sizing: border-box;
			width: 100%;
			min-height: 2.75rem;
			padding: 0 0.9rem 0 2.5rem;
			border: 1px solid var(--mc-border-strong);
			border-radius: var(--mc-radius-md);
			background: var(--mc-card-bg);
			color: var(--mc-text);
			font: inherit;

			&::placeholder {
				color: var(--mc-text-subtle);
			}
		}

		.results {
			position: absolute;
			top: calc(100% + 0.35rem);
			right: 0;
			left: 0;
			z-index: 5;
			margin: 0;
			padding: 0.35rem;
			list-style: none;
			border: 1px solid var(--mc-border-strong);
			border-radius: var(--mc-radius-md);
			background: var(--mc-card-bg);
			box-shadow: var(--mc-shadow-menu);
		}

		.result {
			display: flex;
			justify-content: space-between;
			gap: 1rem;
			padding: 0.5rem 0.65rem;
			border-radius: var(--mc-radius-sm);
			cursor: pointer;

			&:hover,
			&.is-active {
				background: var(--mc-card-bg-hover);
			}
		}

		.name {
			font-weight: 600;
		}

		.kind {
			color: var(--mc-text-muted);
			font-size: 0.75rem;
			letter-spacing: 0.08em;
			text-transform: uppercase;
		}
	`,
})
export class NetworkSearchComponent {
	public readonly query = input.required<string>();
	public readonly results = input.required<NetworkSearchResult[]>();

	public readonly queryChange = output<string>();
	public readonly picked = output<string>();

	protected readonly open = signal(false);
	/** Index of the highlighted result; back to none on new results. */
	protected readonly active = linkedSignal<NetworkSearchResult[], number>({
		source: this.results,
		computation: () => -1,
	});
	protected readonly expanded = computed(
		() => this.open() && this.results().length > 0
	);
	protected readonly status = computed(() => {
		const count = this.results().length;

		if (this.query().trim().length < 2) {
			return '';
		}
		return count === 1 ? '1 result' : `${count} results`;
	});

	protected readonly kindLabels = NETWORK_KIND_LABELS;

	protected onInput(event: Event): void {
		this.open.set(true);
		this.queryChange.emit((event.target as HTMLInputElement).value);
	}

	protected onKeydown(event: KeyboardEvent): void {
		const count = this.results().length;

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				this.open.set(true);
				this.active.update((i) => (count ? (i + 1) % count : -1));
				break;
			case 'ArrowUp':
				event.preventDefault();
				this.active.update((i) =>
					count ? (i <= 0 ? count - 1 : i - 1) : -1
				);
				break;
			case 'Enter': {
				const result = this.results()[Math.max(this.active(), 0)];

				if (this.expanded() && result) {
					event.preventDefault();
					this.pick(result);
				}
				break;
			}
			case 'Escape':
				if (this.expanded()) {
					event.preventDefault();
					this.open.set(false);
				}
				break;
		}
	}

	protected onFocusOut(event: FocusEvent): void {
		const host = event.currentTarget as HTMLElement;

		if (!host.contains(event.relatedTarget as Node | null)) {
			this.open.set(false);
		}
	}

	protected pick(result: NetworkSearchResult): void {
		this.open.set(false);
		this.picked.emit(result.nodeId);
	}
}
