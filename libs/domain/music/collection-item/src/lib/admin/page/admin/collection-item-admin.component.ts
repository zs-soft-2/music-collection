import { Observable } from 'rxjs';

import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
	CollectionItemStateService,
	BaseComponent,
	RoleNames,
} from '@music-collection/api';

import { CollectionItemAdminPermissionsService } from '../../service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection-item-admin',
	templateUrl: './collection-item-admin.component.html',
	styleUrls: ['./collection-item-admin.component.scss'],
})
export class CollectionItemAdminComponent
	extends BaseComponent
	implements OnInit
{
	public buttonPermissions: string[] = [];
	public isNewEntityButtonEnabled$!: Observable<boolean>;

	public constructor(
		private activatedRoute: ActivatedRoute,
		private router: Router,
		private collectionItemStateService: CollectionItemStateService
	) {
		super();
	}

	public clickHandler(): void {
		this.router.navigate(['edit', 0], { relativeTo: this.activatedRoute });
	}

	public ngOnInit(): void {
		this.isNewEntityButtonEnabled$ =
			this.collectionItemStateService.selectNewEntityButtonEnabled$();

		this.initButtonPermissions();
	}

	private initButtonPermissions(): void {
		this.buttonPermissions = [
			RoleNames.ADMIN,
			CollectionItemAdminPermissionsService.createCollectionItemEntity,
		];
	}
}
