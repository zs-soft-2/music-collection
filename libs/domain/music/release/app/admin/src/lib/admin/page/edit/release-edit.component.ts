import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BaseComponent } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-release-edit',
	templateUrl: './release-edit.component.html',
	styleUrls: ['./release-edit.component.scss'],
})
export class ReleaseEditComponent extends BaseComponent implements OnInit {
	public releaseId!: string;

	public constructor(private activatedRoute: ActivatedRoute) {
		super();
	}

	public ngOnInit(): void {
		this.releaseId = this.activatedRoute.snapshot.params['releaseId'];
	}
}
