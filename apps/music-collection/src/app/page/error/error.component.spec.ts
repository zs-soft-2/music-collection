import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ErrorComponent } from './error.component';

describe('ErrorComponent', () => {
	let component: ErrorComponent;
	let fixture: ComponentFixture<ErrorComponent>;

	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, ErrorComponent],
			providers: [provideRouter([])],
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(ErrorComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should lead back to the home and the collection page', () => {
		const links = Array.from(
			(fixture.nativeElement as HTMLElement).querySelectorAll('a')
		).map((link) => link.getAttribute('href'));

		expect(links).toEqual(['/home', '/collection']);
	});
});
