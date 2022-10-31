import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AlbumEntity, AlbumHookService } from '@music-collection/api';

@Injectable()
export class MCAlbumHookService extends AlbumHookService {
	public constructor(private router: Router) {
		super();
	}

	public selectEntity(artist: AlbumEntity): void {
		this.router.navigate(['/artist', artist.uid]);
	}
}
