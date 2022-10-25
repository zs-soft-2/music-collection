import { Observable, of } from 'rxjs';

import { Injectable } from '@angular/core';
import { BaseComponent } from '@music-collection/api';

@Injectable()
export class ArtistListService extends BaseComponent {
	public constructor() {
		super();
	}

	public init$(): Observable<boolean> {
		return of(true);
	}
}
