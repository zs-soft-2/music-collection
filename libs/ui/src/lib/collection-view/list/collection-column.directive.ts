import {
	Directive,
	TemplateRef,
	booleanAttribute,
	inject,
	input,
} from '@angular/core';

/**
 * One column of the table view: its heading, what it sorts by, and the
 * template of its cells. It goes on the template of the cell, and the list
 * shows the columns in the order they are written:
 *
 * ```html
 * <ng-template mcColumn header="Name" field="name" let-artist>
 *   {{ artist.name }}
 * </ng-template>
 * ```
 *
 * The heading and the cells are built by the list itself, because that is
 * the only place PrimeNG finds its table from, sorting included.
 */
@Directive({ selector: 'ng-template[mcColumn]' })
export class CollectionColumnDirective {
	/** The heading; empty for the column of the buttons of the row. */
	public readonly header = input('');

	/** What the column sorts by; without it the column does not sort. */
	public readonly field = input('');

	/** The class both the heading and the cells are given. */
	public readonly columnClass = input('');

	/** Keeps the heading for screen readers alone, where it would be noise. */
	public readonly headerHidden = input(false, { transform: booleanAttribute });

	public readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}
