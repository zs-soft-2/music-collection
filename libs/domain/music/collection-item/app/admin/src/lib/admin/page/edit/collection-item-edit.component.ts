import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BaseComponent } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection-item-edit',
	templateUrl: './collection-item-edit.component.html',
	styleUrls: ['./collection-item-edit.component.scss'],
})
export class CollectionItemEditComponent
	extends BaseComponent
	implements OnInit
{
	public collectionItemId!: string;

	public constructor(private activatedRoute: ActivatedRoute) {
		super();
	}

	public ngOnInit(): void {
		this.collectionItemId =
			this.activatedRoute.snapshot.params['collectionItemId'];
	}
}
