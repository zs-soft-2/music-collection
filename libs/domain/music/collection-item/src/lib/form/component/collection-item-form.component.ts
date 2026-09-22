import { Observable } from 'rxjs';

import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import { CollectionItemFormParams, BaseComponent } from '@music-collection/api';

import { CollectionItemFormService } from './collection-item-form.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Bind } from 'primeng/bind';
import { AutoComplete } from 'primeng/autocomplete';
import { DatePicker } from 'primeng/datepicker';
import { Button } from 'primeng/button';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { AsyncPipe } from '@angular/common';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [CollectionItemFormService],
	selector: 'mc-collection-item-form',
	templateUrl: './collection-item-form.component.html',
	styleUrls: ['./collection-item-form.component.scss'],
	imports: [
		FormsModule,
		ReactiveFormsModule,
		Bind,
		AutoComplete,
		DatePicker,
		Button,
		InputNumber,
		Select,
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

	/** Another piece of furniture; the compartment goes with the old one. */
	public chooseUnit(event: any): void {
		this.componentService.chooseUnit(event['value']);
	}

	public chooseSpot(event: any): void {
		this.componentService.chooseSpot(event['value']);
	}

	public choosePosition(event: any): void {
		this.componentService.choosePosition(Number(event['value']));
	}

	public clearPlace(): void {
		this.componentService.clearPlace();
	}
}
