import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlbumEntity, AlbumHookService } from '@music-collection/api';

@Injectable()
export class MCAlbumHookService extends AlbumHookService {
	private router = inject(Router);


	public selectEntity(artist: AlbumEntity): void {
		this.router.navigate(['/artist', artist.uid]);
	}
}
