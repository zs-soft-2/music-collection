import { HttpClientTestingModule } from '@angular/common/http/testing';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { ArtistListModule } from '../../../list/artist-list.module';
import { ArtistAdminComponent } from './artist-admin.component';

describe('ArtistAdminComponent', () => {
	let component: ArtistAdminComponent;
	let fixture: ComponentFixture<ArtistAdminComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [ArtistAdminComponent],
			imports: [
				HttpClientTestingModule,
				RouterTestingModule,
				ArtistListModule,
			],
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(ArtistAdminComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
