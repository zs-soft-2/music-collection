import { MotionOptions } from '@primeuix/motion';
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
import { Bind } from 'primeng/bind';
import { Avatar } from 'primeng/avatar';
import { Menu } from 'primeng/menu';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-user-profile',
	templateUrl: './user-profile.component.html',
	styleUrls: ['./user-profile.component.scss'],
	imports: [Bind, Avatar, Menu],
})
export class UserProfileComponent extends BaseComponent implements OnInit {
	@Input()
	public user!: User;
	public userMenuItems!: MenuItem[];

	// A PrimeNG 22-ben a showTransitionOptions/hideTransitionOptions helyét a
	// motionOptions vette át; a korábbi '0ms' átmenetek megfelelője a kikapcsolt animáció.
	public readonly menuMotionOptions: MotionOptions = { disabled: true };

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
				labelKey: 'nav.admin',
				routerLink: 'admin',
			},
			{
				labelKey: 'nav.logOut',
				icon: 'pi pi-sign-out',
				command: () => {
					this.logout.emit(true);
				},
			},
		];
	}
}
