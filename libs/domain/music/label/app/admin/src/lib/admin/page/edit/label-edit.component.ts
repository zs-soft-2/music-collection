import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BaseComponent } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-label-edit',
	templateUrl: './label-edit.component.html',
	styleUrls: ['./label-edit.component.scss'],
	standalone: false,
})
export class LabelEditComponent extends BaseComponent implements OnInit {
	private activatedRoute = inject(ActivatedRoute);

	public labelId!: string;

	public ngOnInit(): void {
		this.labelId = this.activatedRoute.snapshot.params['labelId'];
	}
}
