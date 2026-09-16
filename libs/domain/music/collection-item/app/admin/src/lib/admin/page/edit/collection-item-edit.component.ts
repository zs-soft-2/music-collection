import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BaseComponent } from '@music-collection/api';
import { CollectionItemFormModule } from '@music-collection/domain/collection-item';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection-item-edit',
	templateUrl: './collection-item-edit.component.html',
	styleUrls: ['./collection-item-edit.component.scss'],
	imports: [CollectionItemFormModule],
})
export class CollectionItemEditComponent
	extends BaseComponent
	implements OnInit
{
	private activatedRoute = inject(ActivatedRoute);

	public collectionItemId!: string;

	public ngOnInit(): void {
		this.collectionItemId =
			this.activatedRoute.snapshot.params['collectionItemId'];
	}
}
