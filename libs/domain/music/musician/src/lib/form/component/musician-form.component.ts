import { Observable } from 'rxjs';

import { AsyncPipe } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	computed,
	inject,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
	BaseComponent,
	MusicianExternalField,
	MusicianFormParams,
} from '@music-collection/api';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';

import { MusicianFormService } from './musician-form.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [MusicianFormService],
	selector: 'mc-musician-form',
	templateUrl: './musician-form.component.html',
	styleUrls: ['./musician-form.component.scss'],
	imports: [
		FormsModule,
		ReactiveFormsModule,
		InputText,
		Textarea,
		Button,
		Checkbox,
		Dialog,
		AsyncPipe,
	],
})
export class MusicianFormComponent extends BaseComponent implements OnInit {
	private componentService = inject(MusicianFormService);

	public params$!: Observable<MusicianFormParams>;

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

	public ngOnInit(): void {
		this.params$ = this.componentService.init$();
	}

	public submit(): void {
		this.componentService.submit();
	}

	public toggleExternalRow(field: MusicianExternalField): void {
		this.componentService.toggleExternalRow(field);
	}
}
