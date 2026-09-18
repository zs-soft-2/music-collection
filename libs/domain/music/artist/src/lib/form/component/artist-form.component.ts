import { Observable } from 'rxjs';

import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import { ArtistFormParams, BaseComponent } from '@music-collection/api';

import { ArtistFormService } from './artist-form.service';
import { ReactiveFormsModule } from '@angular/forms';
import { Bind } from 'primeng/bind';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { MultiSelect } from 'primeng/multiselect';
import { AutoComplete } from 'primeng/autocomplete';
import { Image } from 'primeng/image';
import { Button } from 'primeng/button';
import { AsyncPipe } from '@angular/common';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [ArtistFormService],
	selector: 'mc-artist-form',
	templateUrl: './artist-form.component.html',
	styleUrls: ['./artist-form.component.scss'],
	imports: [
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
		AsyncPipe,
	],
})
export class ArtistFormComponent extends BaseComponent implements OnInit {
	private componentService = inject(ArtistFormService);

	public params$!: Observable<ArtistFormParams>;

	public cancel(): void {
		this.componentService.cancel();
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
