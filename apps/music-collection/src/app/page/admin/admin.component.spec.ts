import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ReleaseRequestEffect } from '../../data/release-request';
import { AdminComponent } from './admin.component';

describe('AdminComponent', () => {
	let component: AdminComponent;
	let fixture: ComponentFixture<AdminComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [AdminComponent],
			providers: [
				provideRouter([]),
				{
					provide: ReleaseRequestEffect,
					useValue: { countPending$: () => of(0) },
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(AdminComponent);

		component = fixture.componentInstance;

		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
