import { Observable } from 'rxjs';

import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { LabelFormParams, BaseComponent } from '@music-collection/api';

import { LabelFormService } from './label-form.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [LabelFormService],
	selector: 'mc-label-form',
	templateUrl: './label-form.component.html',
	styleUrls: ['./label-form.component.scss'],
})
export class LabelFormComponent extends BaseComponent implements OnInit {
	public params$!: Observable<LabelFormParams>;

	public constructor(private componentService: LabelFormService) {
		super();
	}

	public cancel(): void {
		this.componentService.cancel();
	}

	public ngOnInit(): void {
		this.params$ = this.componentService.init$();
	}

	public submit(): void {
		this.componentService.submit();
	}

	public searchLabel(event: any): void {
		this.componentService.searchLabel(event['query']);
	}
}
