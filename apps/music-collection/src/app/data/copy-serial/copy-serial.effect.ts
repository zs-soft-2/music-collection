import { Injectable, inject } from '@angular/core';
import { CollectionItemSerial } from '@music-collection/api';

import { CopySerialRepository } from './copy-serial.repository';

/** Why a number could not be taken. */
export type CopySerialConflict =
	/** Another collector registered this copy first. */
	| 'taken'
	/** The collector already carries this number on a different copy. */
	| 'mine';

/**
 * The number is spoken for. Thrown rather than returned, because the caller
 * has to stop: a copy may not be written with a number it does not hold.
 */
export class CopySerialTakenError extends Error {
	public constructor(
		public readonly conflict: CopySerialConflict,
		/** The collector's own copy holding it, where `conflict` is 'mine'. */
		public readonly itemId: string | null
	) {
		super(`Copy serial ${conflict}`);
		this.name = 'CopySerialTakenError';
	}
}

/**
 * Holding and releasing the number of a numbered copy.
 *
 * The registry is a lock with one key per physical record, and this is the
 * only thing that turns it. Two rules shape everything here: a claim is
 * written once and never edited, and a copy may not carry a number whose
 * claim it does not hold. So taking a number is always a create that either
 * finds nothing and succeeds, or finds something and fails — and where it
 * fails, the collector is told who was there first rather than shown a save
 * that silently did nothing.
 */
@Injectable({ providedIn: 'root' })
export class CopySerialEffect {
	private readonly repository = inject(CopySerialRepository);

	/**
	 * Takes the number for this copy, or throws where it is spoken for.
	 *
	 * The holder is read first only to say *why* it failed. The decision is
	 * not made here: the write that follows is a create, and Firestore is
	 * what refuses it if someone claimed the number in between.
	 */
	public async hold(
		releaseId: string,
		serial: CollectionItemSerial,
		userId: string,
		/** Null while the copy is being added and has no id yet. */
		itemId: string | null
	): Promise<void> {
		const holder = await this.repository.holder(releaseId, serial.number);

		if (holder) {
			// Already ours, on this very copy: the number is held, and
			// re-taking it would be an update, which no one is allowed. Two
			// unknown copies are not the same copy, so a claim that names
			// none never matches — otherwise a number taken while adding one
			// record would look like it was already this one's.
			if (
				holder.userId === userId &&
				!!itemId &&
				holder.itemId === itemId
			) {
				return;
			}
			throw new CopySerialTakenError(
				holder.userId === userId ? 'mine' : 'taken',
				holder.userId === userId ? holder.itemId : null
			);
		}

		try {
			await this.repository.claim({
				releaseId,
				number: serial.number,
				userId,
				itemId,
			});
		} catch (error) {
			// The read said free, the write said otherwise: someone claimed
			// it in the moment between the two. That is the race this
			// registry exists to lose safely.
			console.error(error);
			throw new CopySerialTakenError('taken', null);
		}
	}

	/**
	 * Gives a number back to the registry — the copy was sold, or the number
	 * was mistyped and corrected.
	 *
	 * A failure here is logged and swallowed: the copy has already been
	 * written, and the collector cannot act on it. What it costs is one
	 * number nobody can register, which is worth less than an error standing
	 * in the way of a save that went through.
	 */
	public async release(releaseId: string, number: number): Promise<void> {
		try {
			await this.repository.release(releaseId, number);
		} catch (error) {
			console.error(error);
		}
	}
}
