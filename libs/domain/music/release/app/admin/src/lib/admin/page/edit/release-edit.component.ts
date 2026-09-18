import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BaseComponent } from '@music-collection/api';
import { ReleaseFormModule } from '@music-collection/domain/release';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-release-edit',
	templateUrl: './release-edit.component.html',
	styleUrls: ['./release-edit.component.scss'],
	imports: [ReleaseFormModule],
})
export class ReleaseEditComponent extends BaseComponent implements OnInit {
	private activatedRoute = inject(ActivatedRoute);

	public releaseId!: string;

	public ngOnInit(): void {
		this.releaseId = this.activatedRoute.snapshot.params['releaseId'];
	}
}
