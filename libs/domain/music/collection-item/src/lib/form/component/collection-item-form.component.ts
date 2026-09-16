import { Observable } from 'rxjs';

import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import { CollectionItemFormParams, BaseComponent } from '@music-collection/api';

import { CollectionItemFormService } from './collection-item-form.service';
import { ReactiveFormsModule } from '@angular/forms';
import { Bind } from 'primeng/bind';
import { AutoComplete } from 'primeng/autocomplete';
import { DatePicker } from 'primeng/datepicker';
import { Ripple } from 'primeng/ripple';
import { ButtonDirective } from 'primeng/button';
import { AsyncPipe } from '@angular/common';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [CollectionItemFormService],
	selector: 'mc-collection-item-form',
	templateUrl: './collection-item-form.component.html',
	styleUrls: ['./collection-item-form.component.scss'],
	imports: [
		ReactiveFormsModule,
		Bind,
		AutoComplete,
		DatePicker,
		Ripple,
		ButtonDirective,
		AsyncPipe,
	],
})
export class CollectionItemFormComponent
	extends BaseComponent
	implements OnInit
{
	private componentService = inject(CollectionItemFormService);

	public params$!: Observable<CollectionItemFormParams>;

	public cancel(): void {
		this.componentService.cancel();
	}

	public ngOnInit(): void {
		this.params$ = this.componentService.init$();
	}

	public submit(): void {
		this.componentService.submit();
	}

	public searchRelease(event: any): void {
		this.componentService.searchRelease(event['query']);
	}
}
