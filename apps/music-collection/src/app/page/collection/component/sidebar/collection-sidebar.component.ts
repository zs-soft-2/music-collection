import { Observable, takeUntil, tap } from 'rxjs';

import {
	ChangeDetectionStrategy,
	Component,
	EventEmitter,
	OnInit,
	Output,
} from '@angular/core';
import {
	BaseComponent,
	CollectionItemListConfig,
	CollectionSidebarParams,
} from '@music-collection/api';
import { CollectionSidebarService } from './collection-sidebar.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [CollectionSidebarService],
	selector: 'mc-collection-sidebar',
	templateUrl: './collection-sidebar.component.html',
	styleUrls: ['./collection-sidebar.component.scss'],
})
export class CollectionSidebarComponent
	extends BaseComponent
	implements OnInit
{
	public params$$!: Observable<CollectionSidebarParams>;

	@Output()
	public configChange: EventEmitter<CollectionItemListConfig>;

	public constructor(private componentService: CollectionSidebarService) {
		super();

		this.configChange = new EventEmitter();
	}

	public ngOnInit(): void {
		this.params$$ = this.componentService.init$();
	}

	public openSidebarHandler(): void {
		this.componentService.openSidebar();
	}

	public saveHandler(): void {
		this.configChange.emit(this.componentService.getConfig());
	}
}
