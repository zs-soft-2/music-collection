import {
	ChangeDetectionStrategy,
	Component,
	EventEmitter,
	OnInit,
	Output,
	inject,
} from '@angular/core';
import { BaseComponent, CollectionItemListConfig } from '@music-collection/api';

import { CollectionSidebarService } from './collection-sidebar.service';
import { CollectionSidebarStore } from './collection-sidebar.store';
import { Bind } from 'primeng/bind';
import { Drawer } from 'primeng/drawer';
import {
	DefaultLayoutDirective,
	DefaultLayoutAlignDirective,
	DefaultFlexDirective,
} from 'ng-flex-layout/flex';
import {
	Accordion,
	AccordionPanel,
	AccordionHeader,
	AccordionContent,
} from 'primeng/accordion';
import { Ripple } from 'primeng/ripple';
import { RadioButton } from 'primeng/radiobutton';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MultiSelect } from 'primeng/multiselect';
import { ButtonDirective } from 'primeng/button';
import { TitleCasePipe } from '@angular/common';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [CollectionSidebarService, CollectionSidebarStore],
	selector: 'mc-collection-sidebar',
	templateUrl: './collection-sidebar.component.html',
	styleUrls: ['./collection-sidebar.component.scss'],
	imports: [
		Bind,
		Drawer,
		DefaultLayoutDirective,
		DefaultLayoutAlignDirective,
		Accordion,
		DefaultFlexDirective,
		AccordionPanel,
		Ripple,
		AccordionHeader,
		AccordionContent,
		RadioButton,
		ReactiveFormsModule,
		FormsModule,
		MultiSelect,
		ButtonDirective,
		TitleCasePipe,
	],
})
export class CollectionSidebarComponent
	extends BaseComponent
	implements OnInit
{
	private componentService = inject(CollectionSidebarService);

	public store = inject(CollectionSidebarStore);

	@Output()
	public configChange: EventEmitter<CollectionItemListConfig>;

	public constructor() {
		super();

		this.configChange = new EventEmitter();
	}

	public ngOnInit(): void {
		this.componentService.init$(this.configChange);
	}
}
