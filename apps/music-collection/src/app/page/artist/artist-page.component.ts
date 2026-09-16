import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlbumEntity } from '@music-collection/api';
import { ArtistDetailModule } from '@music-collection/domain/artist';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-artist-page',
	templateUrl: './artist-page.component.html',
	styleUrls: ['./artist-page.component.scss'],
	imports: [ArtistDetailModule],
})
export class ArtistPageComponent {
	private router = inject(Router);

	public selectDetailHandler(album: AlbumEntity): void {
		this.router.navigate(['album', album.uid]);
	}
}
