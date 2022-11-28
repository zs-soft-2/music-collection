import { Observable } from 'rxjs';

import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CollectionItemFormParams, BaseComponent } from '@music-collection/api';

import { CollectionItemFormService } from './collection-item-form.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [CollectionItemFormService],
	selector: 'mc-collection-item-form',
	templateUrl: './collection-item-form.component.html',
	styleUrls: ['./collection-item-form.component.scss'],
})
export class CollectionItemFormComponent
	extends BaseComponent
	implements OnInit
{
	public params$!: Observable<CollectionItemFormParams>;

	public constructor(private componentService: CollectionItemFormService) {
		super();
	}

	public cancel(): void {
		this.componentService.cancel();
	}

	public ngOnInit(): void {
		this.params$ = this.componentService.init$();
	}

	public submit(): void {
		this.componentService.submit();
	}

	public searchRelease(event: any): void {
		this.componentService.searchRelease(event['query']);
	}
}
