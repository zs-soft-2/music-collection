import { CollectionItemDisposalReason } from '@music-collection/api';
import { MediaFormat } from '@music-collection/ui/music-view';

/** What the collector tells about a copy leaving the collection. */
export interface DisposalDraft {
	reason: CollectionItemDisposalReason;
	/** When it left (epoch ms). */
	date: number;
	note: string | null;
}

/**
 * What the removal dialog shows of the copy: enough to tell one pressing from
 * another where the collector owns several of the same album.
 *
 * Deliberately narrower than `ReleaseView`, which a `ReleaseView` still
 * satisfies. The collection and the album page hold one of those per record;
 * a copy's own page does not, and building one there only to open a dialog
 * would mean a second mapper for five fields it already has.
 */
export interface RemovedCopyView {
	format: MediaFormat;
	/** Pressing weight in grams (180g vinyl); `null` where unknown. */
	weight: number | null;
	/** The album on a medium rather than a known pressing. */
	generic: boolean;
	labelName: string | null;
	country: string | null;
}
