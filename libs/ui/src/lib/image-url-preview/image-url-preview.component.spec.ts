import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TranslocoService } from '@jsverse/transloco';

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageUrlPreviewComponent } from './image-url-preview.component';

const MESSAGE_KEY = 'ui.imageUrlPreview.could-not-load';

describe('ImageUrlPreviewComponent', () => {
	let fixture: ComponentFixture<ImageUrlPreviewComponent>;

	function setUrl(url: string | null | undefined): void {
		fixture.componentRef.setInput('url', url);
		fixture.detectChanges();
	}

	function picture(): HTMLImageElement | null {
		return fixture.nativeElement.querySelector('img');
	}

	function status(): HTMLElement | null {
		return fixture.nativeElement.querySelector('[role="status"]');
	}

	function failToLoad(): void {
		picture()?.dispatchEvent(new Event('error'));
		fixture.detectChanges();
	}

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ImageUrlPreviewComponent],
			providers: [provideI18nTesting()],
		}).compileComponents();

		fixture = TestBed.createComponent(ImageUrlPreviewComponent);
		fixture.componentRef.setInput('alt', 'Photo');
	});

	it.each([[''], [null], [undefined]])(
		'shows neither a picture nor a message for %p',
		(url) => {
			setUrl(url);

			expect(picture()).toBeNull();
			expect(status()?.textContent?.trim()).toBe('');
		}
	);

	it('shows the picture at the address, with no message', () => {
		setUrl('https://a/one.jpg');

		expect(picture()?.getAttribute('src')).toBe('https://a/one.jpg');
		expect(picture()?.getAttribute('alt')).toBe('Photo');
		expect(status()?.textContent?.trim()).toBe('');
	});

	it('replaces a picture that cannot load with the message', () => {
		const text = TestBed.inject(TranslocoService).translate(MESSAGE_KEY);

		setUrl('https://a/one.jpg');
		failToLoad();

		expect(picture()).toBeNull();
		expect(status()?.textContent?.trim()).toBe(text);
		// A key with no translation behind it reads back as itself.
		expect(text).not.toBe(MESSAGE_KEY);
	});

	it('drops the message and tries a new address', () => {
		setUrl('https://a/one.jpg');
		failToLoad();

		setUrl('https://a/two.jpg');

		expect(picture()?.getAttribute('src')).toBe('https://a/two.jpg');
		expect(status()?.textContent?.trim()).toBe('');
	});

	/** R-1: remembering the failed address would show A's old failure. */
	it('tries an address again when the field returns to it', () => {
		setUrl('https://a/one.jpg');
		failToLoad();
		setUrl('https://a/two.jpg');

		setUrl('https://a/one.jpg');

		expect(picture()?.getAttribute('src')).toBe('https://a/one.jpg');
		expect(status()?.textContent?.trim()).toBe('');
	});

	it('drops the message when the field is emptied', () => {
		setUrl('https://a/one.jpg');
		failToLoad();

		setUrl('');

		expect(picture()).toBeNull();
		expect(status()?.textContent?.trim()).toBe('');
	});

	/**
	 * R-6: a live region announces what is added to it, so it has to be in the
	 * document before the message is.
	 */
	it('keeps the status region in the document in every state', () => {
		setUrl('');
		const region = status();

		expect(region).not.toBeNull();

		setUrl('https://a/one.jpg');
		failToLoad();

		expect(status()).toBe(region);
	});
});
