import { select } from 'd3-selection';
import {
	D3ZoomEvent,
	ZoomBehavior,
	ZoomTransform,
	zoom,
	zoomIdentity,
} from 'd3-zoom';

import {
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	ElementRef,
	afterNextRender,
	computed,
	effect,
	inject,
	input,
	output,
	signal,
	untracked,
	viewChild,
} from '@angular/core';

import { NetworkEdge, NetworkNode } from '../../network.model';
import {
	NODE_RADIUS,
	NetworkLayout,
	PlacedNode,
	Point,
	placeNetwork,
	simulateNetwork,
} from './network-graph.layout';

const MIN_SCALE = 0.15;
const MAX_SCALE = 3;
/** Largest zoom "fit" goes to, so a small network is not blown up. */
const FIT_MAX_SCALE = 1.2;
const FIT_PADDING = 90;
const ZOOM_STEP = 1.3;
/** Edge labels are unreadable below this zoom. */
const EDGE_LABEL_MIN_SCALE = 0.7;
const PAN_STEP = 60;
/** Up to this many edges every edge is labelled. */
const ALL_EDGE_LABELS_MAX = 16;

/**
 * Pannable, zoomable drawing of the relationship network. d3 only computes:
 * the force layout places the nodes and d3-zoom turns pointer / wheel input
 * into a transform; Angular renders the SVG.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-network-graph',
	templateUrl: './network-graph.component.html',
	styleUrls: ['./network-graph.component.scss'],
})
export class NetworkGraphComponent {
	public readonly nodes = input.required<NetworkNode[]>();
	public readonly edges = input.required<NetworkEdge[]>();
	public readonly focusId = input<string | null>(null);
	public readonly selectedId = input<string | null>(null);
	/** Shown in the full-screen dialog (switches the toggle's icon and label). */
	public readonly expanded = input(false);

	/** A node was clicked or activated from the keyboard. */
	public readonly nodeSelect = output<string>();
	/** A node was double-clicked (or `F` pressed on it): make it the focus. */
	public readonly nodeFocus = output<string>();
	/** The full-screen toggle was pressed. */
	public readonly expandToggle = output<void>();

	private readonly svg = viewChild.required<ElementRef<SVGSVGElement>>('svg');
	private readonly destroyRef = inject(DestroyRef);

	/** Simulated positions, before they are stretched to the canvas. */
	private readonly simulated = signal<ReadonlyMap<string, Point>>(new Map());
	protected readonly transform = signal<ZoomTransform>(zoomIdentity);
	private readonly size = signal({ width: 0, height: 0 });

	protected readonly layout = computed<NetworkLayout>(() => {
		const { width, height } = this.size();

		return placeNetwork(
			this.nodes(),
			this.edges(),
			this.simulated(),
			width && height ? width / height : 1
		);
	});

	protected readonly transformAttr = computed(() => {
		const { x, y, k } = this.transform();

		return `translate(${x},${y}) scale(${k})`;
	});
	protected readonly showEdgeLabels = computed(
		() => this.transform().k >= EDGE_LABEL_MIN_SCALE
	);
	/** Labelled edges: all of a small graph, else those of the selection. */
	protected readonly labelledEdges = computed(() => {
		const edges = this.layout().edges;
		const selectedId = this.selectedId();

		return new Set(
			edges
				.filter(
					(edge) =>
						edges.length <= ALL_EDGE_LABELS_MAX ||
						edge.source === selectedId ||
						edge.target === selectedId
				)
				.map((edge) => edge.id)
		);
	});
	/** Nodes touching the selection; the rest of the graph is dimmed. */
	protected readonly highlighted = computed(() => {
		const selectedId = this.selectedId();

		if (!selectedId) {
			return null;
		}
		const ids = new Set([selectedId]);

		for (const edge of this.edges()) {
			if (edge.source === selectedId) ids.add(edge.target);
			if (edge.target === selectedId) ids.add(edge.source);
		}
		return ids;
	});
	protected readonly summary = computed(() => {
		const { nodes, edges } = this.layout();

		return `Relationship network: ${nodes.length} nodes, ${edges.length} connections. Use Tab to move between nodes, Enter to show details, F to focus on a node.`;
	});

	protected readonly radius = NODE_RADIUS;

	private zoomBehavior: ZoomBehavior<SVGSVGElement, unknown> | null = null;
	private laidOutFocus: string | null = null;
	private fittedFocus: string | null = null;
	/** The user zoomed or panned since the last fit: keep their view. */
	private userAdjusted = false;
	private fitting = false;

	constructor() {
		// Re-layout when the network changes; positions carry over.
		effect(() => {
			const nodes = this.nodes();
			const edges = this.edges();
			const focusId = this.focusId();

			untracked(() => {
				// A new focus is laid out afresh around it; otherwise positions
				// carry over, so filtering does not reshuffle the graph.
				this.simulated.set(
					simulateNetwork(
						nodes,
						edges,
						focusId,
						focusId === this.laidOutFocus
							? this.simulated()
							: new Map()
					)
				);
				this.laidOutFocus = focusId;
			});
		});

		// Keep the network filling the canvas: on a new focus always, on a
		// resize or filter change unless the user has zoomed or panned.
		effect(() => {
			const { nodes } = this.layout();
			const { width } = this.size();
			const focusId = this.focusId();

			if (!nodes.length || !width || !this.zoomBehavior) {
				return;
			}
			if (focusId !== this.fittedFocus || !this.userAdjusted) {
				this.fittedFocus = focusId;
				untracked(() => this.fit());
			}
		});

		afterNextRender(() => {
			const svg = this.svg().nativeElement;

			this.zoomBehavior = zoom<SVGSVGElement, unknown>()
				.scaleExtent([MIN_SCALE, MAX_SCALE])
				.on('zoom', (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
					// Wheel, drag, keys and the zoom buttons adjust the view;
					// only fit() resets it.
					if (!this.fitting) {
						this.userAdjusted = true;
					}
					this.transform.set(event.transform);
				});
			select(svg)
				.call(this.zoomBehavior)
				// Double click belongs to the nodes (focus), not to zooming.
				.on('dblclick.zoom', null);

			const observer = new ResizeObserver(([entry]) =>
				this.size.set({
					width: entry.contentRect.width,
					height: entry.contentRect.height,
				})
			);

			observer.observe(svg);
			this.destroyRef.onDestroy(() => {
				observer.disconnect();
				select(svg).on('.zoom', null);
			});
		});
	}

	public zoomIn(): void {
		this.scaleBy(ZOOM_STEP);
	}

	public zoomOut(): void {
		this.scaleBy(1 / ZOOM_STEP);
	}

	/** Zooms and pans so that every node is visible. */
	public fit(): void {
		const { nodes } = this.layout();
		const { width, height } = this.size();

		if (!this.zoomBehavior || !nodes.length || !width || !height) {
			return;
		}
		const xs = nodes.map((node) => node.x);
		const ys = nodes.map((node) => node.y);
		const minX = Math.min(...xs) - FIT_PADDING;
		const maxX = Math.max(...xs) + FIT_PADDING;
		const minY = Math.min(...ys) - FIT_PADDING;
		const maxY = Math.max(...ys) + FIT_PADDING;
		const scale = Math.max(
			MIN_SCALE,
			Math.min(
				width / (maxX - minX),
				height / (maxY - minY),
				FIT_MAX_SCALE
			)
		);

		this.fitting = true;
		select(this.svg().nativeElement).call(
			this.zoomBehavior.transform,
			zoomIdentity
				.translate(width / 2, height / 2)
				.scale(scale)
				.translate(-(minX + maxX) / 2, -(minY + maxY) / 2)
		);
		this.fitting = false;
		this.userAdjusted = false;
	}

	protected onNodeKeydown(event: KeyboardEvent, node: PlacedNode): void {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			this.nodeSelect.emit(node.id);
		} else if (event.key === 'f' || event.key === 'F') {
			event.preventDefault();
			this.nodeFocus.emit(node.id);
		}
	}

	/** Keyboard navigation: keep the focused node on screen. */
	protected reveal(node: PlacedNode): void {
		const { width, height } = this.size();
		const [x, y] = this.transform().apply([node.x, node.y]);
		const margin = this.radius[node.kind] + 40;

		if (
			this.zoomBehavior &&
			(x < margin ||
				y < margin ||
				x > width - margin ||
				y > height - margin)
		) {
			select(this.svg().nativeElement).call(
				this.zoomBehavior.translateTo,
				node.x,
				node.y
			);
		}
	}

	/** Arrow keys pan and +/- zoom while the canvas itself has focus. */
	protected onCanvasKeydown(event: KeyboardEvent): void {
		if (event.target !== this.svg().nativeElement || !this.zoomBehavior) {
			return;
		}
		const pan: Record<string, [number, number]> = {
			ArrowLeft: [PAN_STEP, 0],
			ArrowRight: [-PAN_STEP, 0],
			ArrowUp: [0, PAN_STEP],
			ArrowDown: [0, -PAN_STEP],
		};

		if (pan[event.key]) {
			event.preventDefault();
			const [dx, dy] = pan[event.key];
			const k = this.transform().k;

			select(this.svg().nativeElement).call(
				this.zoomBehavior.translateBy,
				dx / k,
				dy / k
			);
		} else if (event.key === '+' || event.key === '=') {
			event.preventDefault();
			this.zoomIn();
		} else if (event.key === '-') {
			event.preventDefault();
			this.zoomOut();
		} else if (event.key === '0') {
			event.preventDefault();
			this.fit();
		}
	}

	protected isDimmed(id: string): boolean {
		const highlighted = this.highlighted();

		return !!highlighted && !highlighted.has(id);
	}

	protected hexagon(radius: number): string {
		return Array.from({ length: 6 }, (_, i) => {
			const angle = (Math.PI / 3) * i - Math.PI / 2;

			return `${Math.cos(angle) * radius},${Math.sin(angle) * radius}`;
		}).join(' ');
	}

	/** Rhombus of a formation; wider than tall, so labels stay clear. */
	protected diamond(radius: number): string {
		const width = radius * 1.35;

		return `0,${-radius} ${width},0 0,${radius} ${-width},0`;
	}

	private scaleBy(factor: number): void {
		if (this.zoomBehavior) {
			select(this.svg().nativeElement).call(
				this.zoomBehavior.scaleBy,
				factor
			);
		}
	}
}
