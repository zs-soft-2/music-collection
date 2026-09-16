import { Observable } from 'rxjs';

import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import { AlbumFormParams, BaseComponent } from '@music-collection/api';

import { AlbumFormService } from './album-form.service';
import { ReactiveFormsModule } from '@angular/forms';
import { Bind } from 'primeng/bind';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { Ripple } from 'primeng/ripple';
import { AutoComplete } from 'primeng/autocomplete';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { MultiSelect } from 'primeng/multiselect';
import { Image } from 'primeng/image';
import { ButtonDirective } from 'primeng/button';
import { AsyncPipe } from '@angular/common';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [AlbumFormService],
	selector: 'mc-album-form',
	templateUrl: './album-form.component.html',
	styleUrls: ['./album-form.component.scss'],
	imports: [
		ReactiveFormsModule,
		Bind,
		Tabs,
		TabList,
		Ripple,
		Tab,
		TabPanels,
		TabPanel,
		AutoComplete,
		InputText,
		Select,
		DatePicker,
		MultiSelect,
		Image,
		ButtonDirective,
		AsyncPipe,
	],
})
export class AlbumFormComponent extends BaseComponent implements OnInit {
	private componentService = inject(AlbumFormService);

	public params$!: Observable<AlbumFormParams>;

	public cancel(): void {
		this.componentService.cancel();
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
