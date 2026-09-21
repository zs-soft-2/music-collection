import { Observable } from 'rxjs';

import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	computed,
	inject,
} from '@angular/core';
import {
	ArtistExternalField,
	ArtistFormParams,
	BaseComponent,
} from '@music-collection/api';

import { ArtistFormService } from './artist-form.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Bind } from 'primeng/bind';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { MultiSelect } from 'primeng/multiselect';
import { AutoComplete } from 'primeng/autocomplete';
import { Image } from 'primeng/image';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { Dialog } from 'primeng/dialog';
import { AsyncPipe } from '@angular/common';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [ArtistFormService],
	selector: 'mc-artist-form',
	templateUrl: './artist-form.component.html',
	styleUrls: ['./artist-form.component.scss'],
	imports: [
		FormsModule,
		ReactiveFormsModule,
		Bind,
		InputText,
		Textarea,
		Select,
		DatePicker,
		MultiSelect,
		AutoComplete,
		Image,
		Button,
		Checkbox,
		Dialog,
		AsyncPipe,
	],
})
export class ArtistFormComponent extends BaseComponent implements OnInit {
	private componentService = inject(ArtistFormService);

	public params$!: Observable<ArtistFormParams>;

	public readonly duplicate = this.componentService.duplicate;
	public readonly externalComparison =
		this.componentService.externalComparison;
	public readonly externalError = this.componentService.externalError;
	public readonly externalLoading = this.componentService.externalLoading;
	public readonly hasSelectedExternalRow = computed(
		() => !!this.externalComparison()?.rows.some((row) => row.selected)
	);

	public applyExternal(): void {
		this.componentService.applyExternal();
	}

	public cancel(): void {
		this.componentService.cancel();
	}

	public closeExternal(): void {
		this.componentService.closeExternal();
	}

	public loadExternal(): void {
		void this.componentService.loadExternal();
	}

	public openDuplicate(): void {
		this.componentService.openDuplicate();
	}

	public toggleExternalRow(field: ArtistExternalField): void {
		this.componentService.toggleExternalRow(field);
	}

	public ngOnInit(): void {
		this.params$ = this.componentService.init$();
	}

	public mainImageUpload(event: any): void {
		this.componentService.mainImageUpload(event['files'][0]);
	}

	public submit(): void {
		this.componentService.submit();
	}

	public searchDocument(event: any): void {
		this.componentService.searchDocument(event['query']);
	}
}
