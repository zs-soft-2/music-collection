import { Injectable } from '@angular/core';
import {
	ARTIST_FEATURE_KEY,
	ArtistModel,
	ArtistModelAdd,
	ArtistModelUpdate,
	OwnedFirebaseDataService,
} from '@music-collection/api';

/**
 * Data access for the bands a collector entered themselves
 * (`user/{uid}/owned-artist`).
 *
 * Same model as the catalog's artists — so a band that later earns its place
 * moves over as it is — kept under its owner rather than in the catalog. The
 * base class is what keeps the two apart; there is nothing to add here but
 * the feature it mirrors.
 */
@Injectable({ providedIn: 'root' })
export class OwnedArtistRepository extends OwnedFirebaseDataService<
	ArtistModel,
	ArtistModelAdd,
	ArtistModelUpdate
> {
	public constructor() {
		super();

		this.catalogFeatureKey = ARTIST_FEATURE_KEY;
	}
}
