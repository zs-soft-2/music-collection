import { Observable, filter, first, map, of, switchMap } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
	MusicianEntity,
	MusicianFormParams,
	MusicianStateService,
	MusicianUtilService,
	ReturnNavigationService,
} from '@music-collection/api';

@Injectable()
export class MusicianFormService {
	private activatedRoute = inject(ActivatedRoute);
	private musicianStateService = inject(MusicianStateService);
	private musicianUtilService = inject(MusicianUtilService);
	private returnNavigation = inject(ReturnNavigationService);

	private musician: MusicianEntity | undefined;
	private params!: MusicianFormParams;

	public cancel(): void {
		this.returnNavigation.leave(['../../list'], this.activatedRoute);
	}

	public init$(): Observable<MusicianFormParams> {
		return this.activatedRoute.params.pipe(
			// Read once: a later store update must not reset the edited form.
			switchMap((data) =>
				data['musicianId'] === '0'
					? of(undefined)
					: this.musicianStateService
							.selectEntityById$(data['musicianId'])
							.pipe(
								filter((musician) => !!musician),
								first()
							)
			),
			map((musician) => {
				this.musician = musician;
				this.params = {
					formGroup:
						this.musicianUtilService.createFormGroup(musician),
				};

				return this.params;
			})
		);
	}

	public submit(): void {
		if (this.musician) {
			this.musicianStateService.dispatchUpdateEntityAction(
				this.musicianUtilService.updateEntity(this.params.formGroup)
			);
		} else {
			this.musicianStateService.dispatchAddEntityAction(
				this.musicianUtilService.createEntity(this.params.formGroup)
			);
		}

		this.returnNavigation.leave(['../../list'], this.activatedRoute);
	}
}
