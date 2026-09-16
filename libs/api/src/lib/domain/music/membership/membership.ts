import { Entity } from '../../../common';

/**
 * A musician's time in a band. Queryable in both directions: a band's line-up
 * (`artistUid`) and a musician's bands (`musicianUid`), and by years.
 */
export interface Membership {
	artistUid: string;
	artistName: string;
	musicianUid: string;
	musicianName: string;
	/** Band member, or a guest who only performed on some recordings. */
	kind: 'member' | 'guest';
	/** Instruments / performing roles, e.g. "Vocals", "Lead Guitar". */
	instruments: string[];
	/** First and last year on record (album years); editable by hand. */
	from: number | null;
	to: number | null;
	/** Still in the band according to Discogs; null when unknown. */
	active: boolean | null;
	albumCount: number;
	albumUids: string[];
	source?: string;
}

export type MembershipEntity = Membership & Entity;
