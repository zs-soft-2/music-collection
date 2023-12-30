import { Observable } from 'rxjs';

import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
	DocumentStateService,
	BaseComponent,
	RoleNames,
} from '@music-collection/api';

import { DocumentAdminPermissionsService } from '../../service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-document-admin',
	templateUrl: './document-admin.component.html',
	styleUrls: ['./document-admin.component.scss'],
})
export class DocumentAdminComponent extends BaseComponent implements OnInit {
	public buttonPermissions: string[] = [];
	public isNewEntityButtonEnabled$!: Observable<boolean>;

	public constructor(
		private activatedRoute: ActivatedRoute,
		private router: Router,
		private documentStateService: DocumentStateService
	) {
		super();
	}

	public clickHandler(): void {
		this.router.navigate(['edit', 0], { relativeTo: this.activatedRoute });
	}

	public ngOnInit(): void {
		this.isNewEntityButtonEnabled$ =
			this.documentStateService.selectNewEntityButtonEnabled$();

		this.initButtonPermissions();
	}

	private initButtonPermissions(): void {
		this.buttonPermissions = [
			RoleNames.ADMIN,
			DocumentAdminPermissionsService.createDocumentEntity,
		];
	}
}
