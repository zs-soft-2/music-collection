import {
	COLLECTION_ITEM_SERIAL_MAX,
	CollectionItemSerial,
} from './collection-item';

/** Firestore collection and sync feature key of the serial claims. */
export const COPY_SERIAL_FEATURE_KEY = 'copy-serial';

/**
 * A claim on one numbered copy: this pressing, this number, this collector.
 *
 * Two collectors can own the same album, the same pressing, even the same
 * sleeve variant — that is the normal case, not a mistake. What they cannot
 * both own is copy 123 of an edition of 500, because there is one of it in
 * the world. This registry is where that is held.
 *
 * The exclusivity is the document id, not a field: the id *is*
 * `{releaseId}_{number}`, and the rules allow a create and refuse every
 * update. A second collector writing the same number is writing over a
 * document that already stands, which is an update, which is denied. No
 * transaction, no counter, no reading before writing — the id does it.
 *
 * A claim is held, not proved. Nothing here can tell whether the collector
 * really has the record in their hands; what it can tell is that two people
 * have not both written it down.
 */
export interface CopySerialClaim {
	/** `ReleaseEntity.uid` of the pressing that was numbered. */
	releaseId: string;
	/** The copy's number within that pressing, counted from 1. */
	number: number;
	/** The collector holding it. */
	userId: string;
	/**
	 * Their copy that carries the number, so a claim leads back to it.
	 *
	 * Null where the number was taken for a copy that did not exist yet —
	 * adding a record and numbering it are one gesture, and the number has to
	 * be held before the copy is written or the write would be refused. A
	 * claim cannot be edited afterwards, so it stays null: all it costs is
	 * that such a claim cannot name the copy it belongs to.
	 */
	itemId: string | null;
}

/**
 * The claim's document id — the whole of the exclusivity.
 *
 * Release ids carry no underscore-then-digits tail, so the pair cannot be
 * spelled two ways: the number is an integer, and an integer holds no
 * separator to move the split.
 */
export function toCopySerialClaimId(releaseId: string, number: number): string {
	return `${releaseId}_${number}`;
}

/**
 * What is wrong with a typed pair of numbers, read in the order a collector
 * would notice it. Null where the pair is fine, including where both are
 * empty — almost no record is numbered, and saying nothing is the norm.
 */
export type CopySerialProblem =
	/** The copy's own number is not a counting number. */
	| 'number'
	/** The edition size is not a counting number. */
	| 'total'
	/** The 600th copy of an edition of 500 — each is fine, the pair is not. */
	| 'tooLarge'
	/** An edition size with no copy number: it says nothing about this copy. */
	| 'totalAlone';

export function copySerialProblem(
	number: string,
	total: string
): CopySerialProblem | null {
	if (countProblem(number)) {
		return 'number';
	}
	if (countProblem(total)) {
		return 'total';
	}
	if (!number.trim()) {
		return total.trim() ? 'totalAlone' : null;
	}

	return total.trim() && Number(total) < Number(number) ? 'tooLarge' : null;
}

/**
 * The typed pair as the record keeps it, or null where no copy number was
 * given. An edition size on its own is dropped: knowing that 500 were made
 * says nothing about which one this is, and which-one is the whole point.
 */
export function toCollectionItemSerial(
	number: string,
	total: string
): CollectionItemSerial | null {
	const copy = toCount(number);

	return copy === null ? null : { number: copy, total: toCount(total) };
}

/** A counting number within the registry's range, or null. */
function toCount(typed: string): number | null {
	const trimmed = typed.trim();
	const value = Number(trimmed);

	return trimmed &&
		Number.isInteger(value) &&
		value >= 1 &&
		value <= COLLECTION_ITEM_SERIAL_MAX
		? value
		: null;
}

/** Empty is fine; anything that is not a counting number is not. */
function countProblem(typed: string): boolean {
	return !!typed.trim() && toCount(typed) === null;
}
