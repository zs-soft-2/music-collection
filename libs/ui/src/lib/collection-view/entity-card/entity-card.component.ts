import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
} from '@angular/core';

/**
 * One entity in the card view of a collection page. The default content
 * goes under the title (tags); `[cardActions]` content sits in the corner.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-entity-card',
	templateUrl: './entity-card.component.html',
	styleUrls: ['./entity-card.component.scss'],
})
export class EntityCardComponent {
	public readonly title = input.required<string>();
	public readonly subtitle = input<string | null | undefined>(null);
	public readonly imageUrl = input<string | null | undefined>(null);
	/** Round for people and bands, square for covers and files. */
	public readonly imageShape = input<'round' | 'square'>('square');

	public readonly open = output<void>();

	public readonly initial = computed(() =>
		(this.title() || '?').charAt(0).toUpperCase()
	);
}
