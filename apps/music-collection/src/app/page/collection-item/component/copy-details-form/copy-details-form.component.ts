import { I18N_IMPORTS } from '@music-collection/core/i18n';
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	input,
	output,
	signal,
} from '@angular/core';
import {
	COLLECTION_ITEM_GRADES,
	COLLECTION_ITEM_GRADE_LABELS,
	CollectionItemGrade,
	copySerialProblem,
} from '@music-collection/api';

import { CopyDraft } from '../../collection-item-page.store';

const STORY_MAX_LENGTH = 5000;
const PLACE_MAX_LENGTH = 200;

/** `YYYY-MM-DD` of the local day, as a date input takes it. */
function toDateInput(date: Date): string {
	const pad = (value: number) => String(value).padStart(2, '0');

	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
		date.getDate()
	)}`;
}

/**
 * What the collector tells about the copy: how it was come by, how it has
 * held up, and the story behind it.
 *
 * Every field may be left empty — most records are just bought, and a
 * collection full of half-filled forms would be worse than one that only
 * says what is actually known.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-copy-details-form',
	imports: [...I18N_IMPORTS],
	templateUrl: './copy-details-form.component.html',
	styleUrls: ['./copy-details-form.component.scss'],
})
export class CopyDetailsFormComponent {
	/** The copy as it stands; the form opens on this. */
	public readonly draft = input.required<CopyDraft>();
	public readonly busy = input(false);
	public readonly error = input<string | null>(null);

	public readonly saved = output<CopyDraft>();
	public readonly cancelled = output<void>();

	protected readonly grades = COLLECTION_ITEM_GRADES;
	protected readonly gradeLabels = COLLECTION_ITEM_GRADE_LABELS;
	protected readonly storyMaxLength = STORY_MAX_LENGTH;
	protected readonly placeMaxLength = PLACE_MAX_LENGTH;
	protected readonly today = toDateInput(new Date());

	protected readonly description = signal('');
	protected readonly purchaseDate = signal('');
	protected readonly purchasePlace = signal('');
	protected readonly purchasePrice = signal('');
	protected readonly purchaseCurrency = signal('');
	protected readonly mediaGrade = signal<CollectionItemGrade | null>(null);
	protected readonly sleeveGrade = signal<CollectionItemGrade | null>(null);
	protected readonly serialNumber = signal('');
	protected readonly serialTotal = signal('');
	protected readonly story = signal('');

	/** A record cannot have been bought after today. */
	protected readonly dateInvalid = computed(
		() => !!this.purchaseDate() && this.purchaseDate() > this.today
	);

	protected readonly priceInvalid = computed(() => {
		const typed = this.purchasePrice().trim();

		if (!typed) {
			return false;
		}
		const price = Number(typed.replace(',', '.'));

		return !Number.isFinite(price) || price < 0;
	});

	/**
	 * What is wrong with the pair of numbers, if anything. One value rather
	 * than a flag apiece: the copy number and the edition size are only ever
	 * wrong in relation to each other, and the picker reads it the same way.
	 */
	protected readonly serialProblem = computed(() =>
		copySerialProblem(this.serialNumber(), this.serialTotal())
	);

	protected readonly invalid = computed(
		() =>
			this.dateInvalid() || this.priceInvalid() || !!this.serialProblem()
	);

	public constructor() {
		// The form opens on the copy, and reopens on it whenever the record
		// changes underneath — a save that failed leaves the typing alone,
		// because the draft it came from is the one still shown.
		effect(() => {
			const draft = this.draft();

			this.description.set(draft.description);
			this.purchaseDate.set(draft.purchaseDate);
			this.purchasePlace.set(draft.purchasePlace);
			this.purchasePrice.set(draft.purchasePrice);
			this.purchaseCurrency.set(draft.purchaseCurrency);
			this.mediaGrade.set(draft.mediaGrade);
			this.sleeveGrade.set(draft.sleeveGrade);
			this.serialNumber.set(draft.serialNumber);
			this.serialTotal.set(draft.serialTotal);
			this.story.set(draft.story);
		});
	}

	protected submit(): void {
		if (this.invalid() || this.busy()) {
			return;
		}
		this.saved.emit({
			description: this.description(),
			purchaseDate: this.purchaseDate(),
			purchasePlace: this.purchasePlace(),
			purchasePrice: this.purchasePrice(),
			purchaseCurrency: this.purchaseCurrency(),
			mediaGrade: this.mediaGrade(),
			sleeveGrade: this.sleeveGrade(),
			serialNumber: this.serialNumber(),
			serialTotal: this.serialTotal(),
			story: this.story(),
		});
	}

	protected text(event: Event): string {
		return (event.target as HTMLInputElement | HTMLTextAreaElement).value;
	}

	protected grade(event: Event): CollectionItemGrade | null {
		const value = (event.target as HTMLSelectElement).value;

		return (value as CollectionItemGrade) || null;
	}
}
