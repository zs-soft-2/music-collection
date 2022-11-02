import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { AlbumStateService } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-home',
	templateUrl: './home.component.html',
	styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
	public constructor(private albumStateService: AlbumStateService) {}

	public ngOnInit(): void {
		this.albumStateService.dispatchListEntitiesAction();
	}
}
