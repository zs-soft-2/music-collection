import { HttpClientTestingModule } from '@angular/common/http/testing';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { AlbumCollectionModule } from '../../../collection/album-collection.module';
import { AlbumAdminComponent } from './album-admin.component';

describe('AlbumAdminComponent', () => {
	let component: AlbumAdminComponent;
	let fixture: ComponentFixture<AlbumAdminComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [AlbumAdminComponent],
			imports: [
				HttpClientTestingModule,
				RouterTestingModule,
				AlbumCollectionModule,
			],
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(AlbumAdminComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
