import { NgTemplateOutlet } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	Injector,
	afterNextRender,
	effect,
	inject,
	signal,
	viewChild,
} from '@angular/core';

import { NetworkDetailsComponent } from './component/network-details/network-details.component';
import { NetworkGraphComponent } from './component/network-graph/network-graph.component';
import { NetworkSearchComponent } from './component/network-search/network-search.component';
import { provideNetworkLayoutWorker } from './network-layout.worker-provider';
import {
	MAX_DEPTH,
	MIN_DEPTH,
	NetworkFilterFlag,
	NetworkPageStore,
} from './network-page.store';
import { NETWORK_KIND_LABELS, NetworkNodeKind } from './network.model';

/**
 * Relationship network: musicians and the bands, projects and formations they
 * played in, on a pannable, zoomable graph around a chosen focus, with the
 * selected node's details. The whole view can be opened in a full-screen
 * modal dialog.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [NetworkPageStore, provideNetworkLayoutWorker()],
	selector: 'mc-network-page',
	templateUrl: './network-page.component.html',
	styleUrls: ['./network-page.component.scss'],
	imports: [
		NgTemplateOutlet,
		NetworkGraphComponent,
		NetworkDetailsComponent,
		NetworkSearchComponent,
	],
})
export class NetworkPageComponent {
	protected readonly store = inject(NetworkPageStore);
	private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
	private readonly injector = inject(Injector);
	private readonly dialog =
		viewChild<ElementRef<HTMLDialogElement>>('dialog');

	/** The view is shown in the full-screen dialog. */
	protected readonly expanded = signal(false);

	protected readonly kinds: NetworkNodeKind[] = [
		'musician',
		'band',
		'project',
		'formation',
	];
	protected readonly kindLabels = NETWORK_KIND_LABELS;

	protected readonly depths = Array.from(
		{ length: MAX_DEPTH - MIN_DEPTH + 1 },
		(_, i) => MIN_DEPTH + i
	);

	constructor() {
		// The dialog exists only while expanded; open it modally once rendered.
		effect(() => {
			const dialog = this.dialog()?.nativeElement;

			if (dialog && !dialog.open) {
				dialog.showModal();
			}
		});
	}

	protected toggleExpanded(): void {
		if (this.expanded()) {
			this.collapse();
		} else {
			this.expanded.set(true);
		}
	}

	/** Closing fires `close`, like Escape does. */
	protected collapse(): void {
		this.dialog()?.nativeElement.close();
	}

	protected onDialogClose(): void {
		this.expanded.set(false);
		// Back on the page: return focus to the button that opened the dialog.
		afterNextRender(
			() =>
				this.host.nativeElement
					.querySelector<HTMLElement>('[data-expand-toggle]')
					?.focus(),
			{ injector: this.injector }
		);
	}

	protected onDepthChange(event: Event): void {
		this.store.setDepth(Number((event.target as HTMLSelectElement).value));
	}

	protected onFlagChange(flag: NetworkFilterFlag, event: Event): void {
		this.store.setFlag(flag, (event.target as HTMLInputElement).checked);
	}
}
