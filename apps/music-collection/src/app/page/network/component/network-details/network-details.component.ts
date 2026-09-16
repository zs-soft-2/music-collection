import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	linkedSignal,
	output,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { NetworkDetailsView, NetworkNodeKind } from '../../network.model';

/** Rows of a list shown before "Show all". */
const PREVIEW = 8;

const KIND_LABELS: Record<NetworkNodeKind, string> = {
	musician: 'Musician',
	band: 'Band',
	project: 'Project',
	album: 'Album',
};

/**
 * The selected node of the network in words: its bands or line-up, who the
 * musician played with at the same time, parallel bands and albums. Also the
 * text alternative of the graph.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-network-details',
	imports: [RouterLink],
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
		() => KIND_LABELS[this.details().node.kind]
	);
	protected readonly membershipsTitle = computed(() => {
		switch (this.details().node.kind) {
			case 'musician':
				return 'Bands & projects';
			case 'album':
				return 'Musicians on this album';
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
