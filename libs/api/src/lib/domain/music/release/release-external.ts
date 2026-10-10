import {
	FormatDescriptionEnum,
	MediaEnum,
	ReleaseCountryEnum,
} from '../../../common';
import { ReleaseLabel } from './release';

/**
 * A Discogs pressing as the release form's fields (Load button). What the
 * admin picks on the chooser arrives here, and the comparison screen puts it
 * next to what the form already holds.
 */
export interface ReleaseExternalPressing {
	catno: string | null;
	country: ReleaseCountryEnum | null;
	/** Jan 1 of the pressing's year: Discogs lists no day on a version. */
	date: Date | null;
	/** The Discogs pressing this was read from. */
	discogsReleaseId: number;
	formatDescription: FormatDescriptionEnum[];
	/**
	 * The catalog's label of that name, when it has one. Discogs names a
	 * label; only the catalog can say which document it is, and it may hold
	 * none — then the name is reported and the pick stays the admin's.
	 */
	label: ReleaseLabel | null;
	/** The label as Discogs names it, matched or not. */
	labelName: string | null;
	media: MediaEnum | null;
	name: string;
}

/** The form fields a loaded pressing can fill in. */
export type ReleaseExternalField = keyof Omit<
	ReleaseExternalPressing,
	'labelName'
>;
