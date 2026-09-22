import { Observable } from 'rxjs';

import { ShelfUnitLayout } from './shelf-layout';

/**
 * The furniture the signed-in collector has drawn, wherever a copy is filed
 * by hand. The drawing itself is kept among the user's own settings, which
 * only they can read — so this answers for the signed-in user and for nobody
 * else, and a collector who has drawn nothing gets an empty room.
 */
export abstract class ShelfLayoutService {
	public abstract units$(): Observable<ShelfUnitLayout[]>;
}
