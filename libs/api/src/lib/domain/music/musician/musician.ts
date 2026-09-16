import { Entity } from '../../../common';

/** A person (or group) credited on releases. */
export interface Musician {
	name: string;
	discogsId: number | null;
	source?: string;
}

export type MusicianEntity = Musician & Entity;
