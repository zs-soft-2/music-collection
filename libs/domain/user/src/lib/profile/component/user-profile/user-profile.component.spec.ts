import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EntityTypeEnum, User } from '@music-collection/api';

import { UserProfileComponent } from './user-profile.component';

describe('UserProfileComponent', () => {
	let component: UserProfileComponent;
	let fixture: ComponentFixture<UserProfileComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			providers: [provideI18nTesting()],
			imports: [UserProfileComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(UserProfileComponent);
		component = fixture.componentInstance;

		const user: User = {
			entityType: EntityTypeEnum.User,
			uid: 'user-1',
			displayName: 'Test User',
			photoURL: null,
		};

		fixture.componentRef.setInput('user', user);
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
