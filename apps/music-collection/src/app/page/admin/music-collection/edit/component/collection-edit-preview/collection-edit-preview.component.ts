import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';
import { type MusicCollectionMembership } from '@music-collection/domain/music-collection/api';

/**
 * What the rule catches, beside every tab: the rule resolved against the
 * catalog as it is typed, and what the collection would be worth.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection-edit-preview',
	imports: [...I18N_IMPORTS],
	templateUrl: './collection-edit-preview.component.html',
	styleUrl: './collection-edit-preview.component.scss',
})
export class CollectionEditPreviewComponent {
	/** A rule with no filter catches everything — almost never what was meant. */
	public readonly matchesEverything = input(false);
	public readonly total = input(0);
	public readonly isPreviewing = input(false);
	/** The curator's number when there is one, else what the rule makes it. */
	public readonly points = input(0);
	/** The first records caught; the rest is a count. */
	public readonly albums = input<readonly MusicCollectionMembership[]>([]);
}
