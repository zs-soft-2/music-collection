import { Observable } from 'rxjs';

import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	computed,
	inject,
} from '@angular/core';
import {
	AlbumExternalField,
	AlbumFormParams,
	BaseComponent,
} from '@music-collection/api';

import { AlbumFormService } from './album-form.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Bind } from 'primeng/bind';
import { AutoComplete } from 'primeng/autocomplete';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { MultiSelect } from 'primeng/multiselect';
import { Image } from 'primeng/image';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { Dialog } from 'primeng/dialog';
import { AsyncPipe } from '@angular/common';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [AlbumFormService],
	selector: 'mc-album-form',
	templateUrl: './album-form.component.html',
	styleUrls: ['./album-form.component.scss'],
	imports: [
		FormsModule,
		ReactiveFormsModule,
		Bind,
		AutoComplete,
		InputText,
		Textarea,
		Select,
		DatePicker,
		MultiSelect,
		Image,
		Button,
		Checkbox,
		Dialog,
		AsyncPipe,
	],
})
export class AlbumFormComponent extends BaseComponent implements OnInit {
	private componentService = inject(AlbumFormService);

	public params$!: Observable<AlbumFormParams>;

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

	public toggleExternalRow(field: AlbumExternalField): void {
		this.componentService.toggleExternalRow(field);
	}

	public ngOnInit(): void {
		this.params$ = this.componentService.init$();
	}

	public submit(): void {
		this.componentService.submit();
	}

	public searchArtist(event: any): void {
		this.componentService.searchArtist(event['query']);
	}

	public searchDocument(event: any): void {
		this.componentService.searchDocument(event['query']);
	}
}
