import { Observable } from 'rxjs';

import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { LabelFormParams, BaseComponent } from '@music-collection/api';

import { LabelFormService } from './label-form.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [LabelFormService],
	selector: 'mc-label-form',
	templateUrl: './label-form.component.html',
	styleUrls: ['./label-form.component.scss'],
  standalone: false,
})
export class LabelFormComponent extends BaseComponent implements OnInit {
	private componentService = inject(LabelFormService);

	public params$!: Observable<LabelFormParams>;

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
