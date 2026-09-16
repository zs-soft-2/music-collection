import { Observable } from 'rxjs';

import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import { ReleaseFormParams, BaseComponent } from '@music-collection/api';

import { ReleaseFormService } from './release-form.service';
import { ReactiveFormsModule } from '@angular/forms';
import { Bind } from 'primeng/bind';
import { AutoComplete } from 'primeng/autocomplete';
import { InputText } from 'primeng/inputtext';
import { DatePicker } from 'primeng/datepicker';
import { Select } from 'primeng/select';
import { MultiSelect } from 'primeng/multiselect';
import { Ripple } from 'primeng/ripple';
import { ButtonDirective } from 'primeng/button';
import { AsyncPipe } from '@angular/common';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [ReleaseFormService],
	selector: 'mc-release-form',
	templateUrl: './release-form.component.html',
	styleUrls: ['./release-form.component.scss'],
	imports: [
		ReactiveFormsModule,
		Bind,
		AutoComplete,
		InputText,
		DatePicker,
		Select,
		MultiSelect,
		Ripple,
		ButtonDirective,
		AsyncPipe,
	],
})
export class ReleaseFormComponent extends BaseComponent implements OnInit {
	private componentService = inject(ReleaseFormService);

	public params$!: Observable<ReleaseFormParams>;

	public cancel(): void {
		this.componentService.cancel();
	}

	public ngOnInit(): void {
		this.params$ = this.componentService.init$();
	}

	public submit(): void {
		this.componentService.submit();
	}

	public searchAlbumHandler(event: any): void {
		this.componentService.searchAlbum(event['query']);
	}

	public searchArtistHandler(event: any): void {
		this.componentService.searchArtist(event['query']);
	}

	public searchLabelHandler(event: any): void {
		this.componentService.searchLabel(event['query']);
	}
}
