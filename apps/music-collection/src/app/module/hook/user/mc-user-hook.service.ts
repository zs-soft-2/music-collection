import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { User, UserHookService } from '@music-collection/api';

@Injectable()
export class MCUserHookService extends UserHookService {
	public constructor(private router: Router) {
		super();
	}

	public loadEntity(user: User): void {
		throw new Error('loadEntity of User is not implemented!' + user.uid);
	}
}
