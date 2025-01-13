import { MenuItem } from 'primeng/api';

import {
	ChangeDetectionStrategy,
	Component,
	EventEmitter,
	Input,
	OnInit,
	Output,
} from '@angular/core';
import { BaseComponent, User } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-user-profile',
	templateUrl: './user-profile.component.html',
	styleUrls: ['./user-profile.component.scss'],
  standalone: false,
})
export class UserProfileComponent extends BaseComponent implements OnInit {
	@Input()
	public user!: User;
	public userMenuItems!: MenuItem[];

	@Output()
	public logout: EventEmitter<boolean>;

	public constructor() {
		super();

		this.logout = new EventEmitter();
	}

	public ngOnInit(): void {
		this.userMenuItems = [
			{
				icon: 'pi pi-cog',
				label: 'Admin',
				routerLink: 'admin',
			},
			{
				label: 'Log out',
				icon: 'pi pi-sign-out',
				command: () => {
					this.logout.emit(true);
				},
			},
		];
	}
}
