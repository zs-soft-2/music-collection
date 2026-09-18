import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { User, UserHookService } from '@music-collection/api';

@Injectable()
export class MCUserHookService extends UserHookService {
	private router = inject(Router);


	public loadEntity(user: User): void {
		throw new Error('loadEntity of User is not implemented!' + user.uid);
	}
}
