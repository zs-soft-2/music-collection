import { ActionEnum } from '../../../core';

import { ConcertResourceEnum } from './concert-resource.enum';

/**
 * What may be done to a venue and to a concert. The names are built the same
 * way everywhere in the catalog — action plus resource — and the three places
 * that enforce them (the rules, the route guard, the page) all read these.
 */
export class ConcertPermissionsService {
	static readonly createVenueEntity =
		ActionEnum.CREATE.toString() +
		ConcertResourceEnum.VENUE_ENTITY.toString();
	static readonly deleteVenueEntity =
		ActionEnum.DELETE.toString() +
		ConcertResourceEnum.VENUE_ENTITY.toString();
	static readonly updateVenueEntity =
		ActionEnum.UPDATE.toString() +
		ConcertResourceEnum.VENUE_ENTITY.toString();
	static readonly viewVenueEntity =
		ActionEnum.VIEW.toString() + ConcertResourceEnum.VENUE_ENTITY.toString();

	static readonly createConcertEntity =
		ActionEnum.CREATE.toString() +
		ConcertResourceEnum.CONCERT_ENTITY.toString();
	static readonly deleteConcertEntity =
		ActionEnum.DELETE.toString() +
		ConcertResourceEnum.CONCERT_ENTITY.toString();
	static readonly updateConcertEntity =
		ActionEnum.UPDATE.toString() +
		ConcertResourceEnum.CONCERT_ENTITY.toString();
	static readonly viewConcertEntity =
		ActionEnum.VIEW.toString() +
		ConcertResourceEnum.CONCERT_ENTITY.toString();
}
