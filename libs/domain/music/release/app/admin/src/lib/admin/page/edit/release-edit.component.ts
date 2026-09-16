import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BaseComponent } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-release-edit',
	templateUrl: './release-edit.component.html',
	styleUrls: ['./release-edit.component.scss'],
  standalone: false,
})
export class ReleaseEditComponent extends BaseComponent implements OnInit {
	private activatedRoute = inject(ActivatedRoute);

	public releaseId!: string;

	public ngOnInit(): void {
		this.releaseId = this.activatedRoute.snapshot.params['releaseId'];
	}
}
