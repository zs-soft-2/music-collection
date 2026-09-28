import {
	AutopilotService,
	provideDemoAutopilot,
} from '@zssz-soft/demo-autopilot-core';
import { provideI18nTesting } from '@music-collection/core/i18n/testing';

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { pageTours } from '../../data/demo-tour/tours.script';
import { DemoTourService } from '../../data/demo-tour';
import { DemoTourComponent } from './demo-tour.component';

/**
 * The wiring between the app and the autopilot library, which is the one part
 * of the tour that no dictionary or selector check covers: whether the
 * providers, the three layers and the launcher actually come up together.
 */
describe('DemoTourComponent', () => {
	let prepare: jest.Mock;

	const render = () => {
		const fixture = TestBed.createComponent(DemoTourComponent);

		fixture.detectChanges();

		return fixture;
	};

	beforeEach(() => {
		prepare = jest.fn();

		TestBed.configureTestingModule({
			imports: [DemoTourComponent],
			providers: [
				provideI18nTesting(),
				provideRouter([]),
				provideDemoAutopilot(),
				{
					provide: DemoTourService,
					useValue: {
						wanted: signal(true),
						enabled: signal(true),
						prepare,
						decide: jest.fn(),
						start: jest.fn(),
					},
				},
			],
		});
	});

	it('puts the autopilot’s three layers on the page', () => {
		const host = render().nativeElement as HTMLElement;

		expect(host.querySelector('zs-autopilot-overlay')).toBeTruthy();
		expect(host.querySelector('zs-autopilot-tooltip')).toBeTruthy();
		expect(host.querySelector('zs-autopilot-controls')).toBeTruthy();
	});

	it('asks for the walkthrough as soon as it is on the page', () => {
		render();

		expect(prepare).toHaveBeenCalled();
	});

	/**
	 * The launcher keeps itself off the screen until it has something to play,
	 * so this is also the check that a registered script reaches it.
	 */
	it('shows the launcher once the walkthrough is registered', () => {
		const fixture = render();
		const host = fixture.nativeElement as HTMLElement;

		expect(host.querySelector('.zs-autopilot-controls__fab')).toBeNull();

		TestBed.inject(AutopilotService).registerScript(pageTours[0].script);
		fixture.detectChanges();

		expect(host.querySelector('.zs-autopilot-controls__fab')).toBeTruthy();
	});
});
