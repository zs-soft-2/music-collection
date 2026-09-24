import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	linkedSignal,
	output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { NETWORK_KIND_LABELS, NetworkDetailsView } from '../../network.model';

/** Rows of a list shown before "Show all". */
const PREVIEW = 8;

/**
 * The selected node of the network in words: its groups or line-up, who the
 * musician played with at the same time, parallel groups and albums. Also the
 * text alternative of the graph.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-network-details',
	imports: [...I18N_IMPORTS, RouterLink],
	templateUrl: './network-details.component.html',
	styleUrls: ['./network-details.component.scss'],
})
export class NetworkDetailsComponent {
	public readonly details = input.required<NetworkDetailsView>();
	public readonly focusId = input<string | null>(null);

	/** Show another node's details. */
	public readonly nodeSelect = output<string>();
	/** Make a node the focus of the network. */
	public readonly nodeFocus = output<string>();

	/** Expanded lists; collapsed again when another node is shown. */
	protected readonly expanded = linkedSignal<string, ReadonlySet<string>>({
		source: () => this.details().node.id,
		computation: () => new Set(),
	});

	protected readonly kindLabel = computed(
		() => NETWORK_KIND_LABELS[this.details().node.kind]
	);
	protected readonly membershipsTitle = computed(() => {
		switch (this.details().node.kind) {
			case 'musician':
				return 'Bands, projects & formations';
			default:
				return 'Line-up';
		}
	});
	protected readonly currentLabel = computed(() =>
		this.details().node.kind === 'musician'
			? 'Currently in'
			: 'Current members'
	);
	protected readonly current = computed(() =>
		this.details()
			.memberships.filter((m) => m.active && m.kind === 'member')
			.map((m) => m.name)
	);

	protected readonly preview = PREVIEW;

	protected visible<T>(list: T[], section: string): T[] {
		return this.expanded().has(section) ? list : list.slice(0, PREVIEW);
	}

	protected toggle(section: string): void {
		this.expanded.update((sections) => {
			const next = new Set(sections);

			if (!next.delete(section)) {
				next.add(section);
			}
			return next;
		});
	}

	protected initials(name: string): string {
		return name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase() ?? '')
			.join('');
	}
}
