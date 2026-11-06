import { TestBed } from '@angular/core/testing';
import { provideI18nTesting } from '@music-collection/core/i18n/testing';

import { CollectionImageUploadComponent } from './collection-image-upload.component';

async function setUp(inputs: { uploading?: boolean; disabled?: boolean } = {}) {
	await TestBed.configureTestingModule({
		imports: [CollectionImageUploadComponent],
		providers: [provideI18nTesting()],
	}).compileComponents();

	const fixture = TestBed.createComponent(CollectionImageUploadComponent);
	const files: File[] = [];
	let libraries = 0;

	fixture.componentRef.setInput('uploading', inputs.uploading ?? false);
	fixture.componentRef.setInput('disabled', inputs.disabled ?? false);
	fixture.componentInstance.fileChosen.subscribe((file) => files.push(file));
	fixture.componentInstance.libraryRequested.subscribe(() => libraries++);
	fixture.detectChanges();

	const page = fixture.nativeElement as HTMLElement;

	return { page, files, libraries: () => libraries };
}

describe('CollectionImageUploadComponent', () => {
	it('hands on the chosen file and clears the picker', async () => {
		const { page, files } = await setUp();
		const input = page.querySelector<HTMLInputElement>(
			'input[type="file"]'
		) as HTMLInputElement;
		const file = new File(['x'], 'cover.png', { type: 'image/png' });

		Object.defineProperty(input, 'files', { value: [file] });
		input.dispatchEvent(new Event('change'));

		expect(files).toEqual([file]);
		expect(input.value).toBe('');
	});

	it('opens the library on request', async () => {
		const { page, libraries } = await setUp();

		page.querySelector<HTMLButtonElement>('button')?.click();

		expect(libraries()).toBe(1);
	});

	it('says it is uploading, and takes no second file meanwhile', async () => {
		const { page } = await setUp({ uploading: true, disabled: true });

		expect(page.querySelector('label')?.textContent).toContain(
			'Uploading…'
		);
		expect(
			page.querySelector<HTMLInputElement>('input[type="file"]')?.disabled
		).toBe(true);
	});
});
