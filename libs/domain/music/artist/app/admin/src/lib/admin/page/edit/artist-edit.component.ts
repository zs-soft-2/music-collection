import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BaseComponent } from '@music-collection/api';
import { ArtistFormModule } from '@music-collection/domain/artist';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-artist-edit',
	templateUrl: './artist-edit.component.html',
	styleUrls: ['./artist-edit.component.scss'],
	imports: [ArtistFormModule],
})
export class ArtistEditComponent extends BaseComponent implements OnInit {
	private activatedRoute = inject(ActivatedRoute);

	public artistId!: string;

	public ngOnInit(): void {
		this.artistId = this.activatedRoute.snapshot.params['artistId'];
	}
}
