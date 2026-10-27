import { Observable, map, shareReplay } from 'rxjs';

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { FeatureCollection } from 'geojson';
import { feature } from 'topojson-client';
import { Topology } from 'topojson-specification';

/**
 * The outline of the world, copied into the assets from the `world-atlas`
 * package at build time. The 110m resolution is the coarse one: a country is
 * recognisable, the file is small, and the map never needs more than that —
 * the pins sit on countries, not on streets.
 */
const ATLAS_URL = 'assets/world/countries-110m.json';

@Injectable({ providedIn: 'root' })
export class WorldAtlasRepository {
	private readonly http = inject(HttpClient);

	/** Loaded once per session; the outline does not change. */
	private readonly countries$ = this.http.get<Topology>(ATLAS_URL).pipe(
		map(
			(topology) =>
				feature(
					topology,
					topology.objects['countries']
				) as unknown as FeatureCollection
		),
		shareReplay({ bufferSize: 1, refCount: false })
	);

	public land$(): Observable<FeatureCollection> {
		return this.countries$;
	}
}
