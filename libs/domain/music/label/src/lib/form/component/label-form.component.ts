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
	LabelExternalCandidate,
	LabelExternalField,
	LabelFormParams,
	discogsLabelUrl,
} from '@music-collection/api';
import { AutoComplete } from 'primeng/autocomplete';
import { Bind } from 'primeng/bind';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';

import { LabelFormService } from './label-form.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [LabelFormService],
	selector: 'mc-label-form',
	templateUrl: './label-form.component.html',
	styleUrls: ['./label-form.component.scss'],
	imports: [
		FormsModule,
		ReactiveFormsModule,
		Bind,
		AutoComplete,
		InputText,
		Textarea,
		Button,
		Checkbox,
		Dialog,
		AsyncPipe,
	],
})
export class LabelFormComponent extends BaseComponent implements OnInit {
	private componentService = inject(LabelFormService);

	public params$!: Observable<LabelFormParams>;

	public readonly externalCandidates =
		this.componentService.externalCandidates;
	public readonly externalComparison =
		this.componentService.externalComparison;
	public readonly externalError = this.componentService.externalError;
	public readonly externalLoading = this.componentService.externalLoading;
	public readonly hasSelectedExternalRow = computed(
		() => !!this.externalComparison()?.rows.some((row) => row.selected)
	);

	/** The Discogs page of a candidate, to check which label it is. */
	public readonly discogsLabelUrl = discogsLabelUrl;

	public applyExternal(): void {
		this.componentService.applyExternal();
	}

	public cancel(): void {
		this.componentService.cancel();
	}

	public chooseExternalCandidate(candidate: LabelExternalCandidate): void {
		void this.componentService.chooseExternalCandidate(candidate);
	}

	public closeExternal(): void {
		this.componentService.closeExternal();
	}

	public closeExternalCandidates(): void {
		this.componentService.closeExternalCandidates();
	}

	public loadExternal(): void {
		void this.componentService.loadExternal();
	}

	public ngOnInit(): void {
		this.params$ = this.componentService.init$();
	}

	public searchLabel(event: any): void {
		this.componentService.searchLabel(event['query']);
	}

	public submit(): void {
		this.componentService.submit();
	}

	public toggleExternalRow(field: LabelExternalField): void {
		this.componentService.toggleExternalRow(field);
	}
}
