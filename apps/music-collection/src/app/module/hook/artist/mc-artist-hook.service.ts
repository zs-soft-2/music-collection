import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ArtistEntity, ArtistHookService } from '@music-collection/api';

@Injectable()
export class MCArtistHookService extends ArtistHookService {
	private router = inject(Router);


	public selectEntity(artist: ArtistEntity): void {
		this.router.navigate(['/artist', artist.uid]);
	}
}
