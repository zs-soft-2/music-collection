import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BaseComponent } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-album-edit',
	templateUrl: './album-edit.component.html',
	styleUrls: ['./album-edit.component.scss'],
	standalone: false,
})
export class AlbumEditComponent extends BaseComponent implements OnInit {
	public albumId!: string;

	public constructor(private activatedRoute: ActivatedRoute) {
		super();
	}

	public ngOnInit(): void {
		this.albumId = this.activatedRoute.snapshot.params['albumId'];
	}
}
