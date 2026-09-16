import { Observable } from 'rxjs';

import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import { WishlistItemFormParams, BaseComponent } from '@music-collection/api';

import { WishlistItemFormService } from './wishlist-item-form.service';
import { ReactiveFormsModule } from '@angular/forms';
import { Bind } from 'primeng/bind';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { Ripple } from 'primeng/ripple';
import { AutoComplete } from 'primeng/autocomplete';
import { InputText } from 'primeng/inputtext';
import { MultiSelect } from 'primeng/multiselect';
import { Checkbox } from 'primeng/checkbox';
import { ButtonDirective } from 'primeng/button';
import { AsyncPipe } from '@angular/common';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [WishlistItemFormService],
	selector: 'mc-wishlist-item-form',
	templateUrl: './wishlist-item-form.component.html',
	styleUrls: ['./wishlist-item-form.component.scss'],
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
		MultiSelect,
		Checkbox,
		ButtonDirective,
		AsyncPipe,
	],
})
export class WishlistItemFormComponent extends BaseComponent implements OnInit {
	private componentService = inject(WishlistItemFormService);

	public params$!: Observable<WishlistItemFormParams>;

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
}
