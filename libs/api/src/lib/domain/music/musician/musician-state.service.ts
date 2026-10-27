import { Observable } from 'rxjs';

import { EntityStateService } from '../../../common';
import {
	MusicianEntity,
	MusicianEntityAdd,
	MusicianEntityUpdate,
} from './musician';
import { MusicianExternalProfile } from './musician-external';

export abstract class MusicianStateService extends EntityStateService<
	MusicianEntity,
	MusicianEntityAdd,
	MusicianEntityUpdate
> {
	public abstract dispatchChangeNewEntityButtonEnabled(
		enabled: boolean
	): void;
	public abstract fetchExternalProfile$(
		discogsId: number
	): Observable<MusicianExternalProfile>;
	public abstract selectNewEntityButtonEnabled$(): Observable<boolean>;
	public abstract selectSearchResult$(): Observable<MusicianEntity[]>;
}
