import { Entity } from '../../../common';

/** A musician's credit on an album's original release. */
export interface Contribution {
	albumUid: string;
	musicianUid: string;
	/** Musician name at import time. */
	name: string;
	/** Name as credited on the release, when it differs. */
	creditedAs: string | null;
	/** Discogs role, e.g. "Guitar", "Producer", "Mastered By". */
	role: string;
	/** Role qualifier, e.g. "Lead" for "Guitar [Lead]". */
	roleDetail: string | null;
	/** Track positions the credit is limited to, e.g. "A1, B3". */
	tracks: string | null;
	source?: string;
}

export type ContributionEntity = Contribution & Entity;
