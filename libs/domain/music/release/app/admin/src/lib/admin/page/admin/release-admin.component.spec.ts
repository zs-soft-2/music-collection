import { HttpClientTestingModule } from '@angular/common/http/testing';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { ReleaseCollectionModule } from '../../../collection/release-collection.module';
import { ReleaseAdminComponent } from './release-admin.component';

describe('ReleaseAdminComponent', () => {
	let component: ReleaseAdminComponent;
	let fixture: ComponentFixture<ReleaseAdminComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [ReleaseAdminComponent],
			imports: [
				HttpClientTestingModule,
				RouterTestingModule,
				ReleaseCollectionModule,
			],
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(ReleaseAdminComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
