import { Observable } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { FeatureCollection } from 'geojson';

import { WorldAtlasRepository } from './world-atlas.repository';

/** Loads the outline of the world the map is drawn on. */
@Injectable({ providedIn: 'root' })
export class WorldAtlasEffect {
	private readonly repository = inject(WorldAtlasRepository);

	public land$(): Observable<FeatureCollection> {
		return this.repository.land$();
	}
}
