import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BaseComponent } from '@music-collection/api';
import { MusicianFormModule } from '@music-collection/domain/musician';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-musician-edit',
	templateUrl: './musician-edit.component.html',
	styleUrls: ['./musician-edit.component.scss'],
	imports: [MusicianFormModule],
})
export class MusicianEditComponent extends BaseComponent implements OnInit {
	private activatedRoute = inject(ActivatedRoute);

	public musicianId!: string;

	public ngOnInit(): void {
		this.musicianId = this.activatedRoute.snapshot.params['musicianId'];
	}
}
