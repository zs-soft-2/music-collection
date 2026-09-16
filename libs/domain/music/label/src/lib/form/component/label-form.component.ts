import { Observable } from 'rxjs';

import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import { LabelFormParams, BaseComponent } from '@music-collection/api';

import { LabelFormService } from './label-form.service';
import { ReactiveFormsModule } from '@angular/forms';
import { Bind } from 'primeng/bind';
import { AutoComplete } from 'primeng/autocomplete';
import { InputText } from 'primeng/inputtext';
import { Ripple } from 'primeng/ripple';
import { ButtonDirective } from 'primeng/button';
import { AsyncPipe } from '@angular/common';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [LabelFormService],
	selector: 'mc-label-form',
	templateUrl: './label-form.component.html',
	styleUrls: ['./label-form.component.scss'],
	imports: [
		ReactiveFormsModule,
		Bind,
		AutoComplete,
		InputText,
		Ripple,
		ButtonDirective,
		AsyncPipe,
	],
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
