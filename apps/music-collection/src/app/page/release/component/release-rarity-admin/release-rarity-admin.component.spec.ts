import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReleaseEntity } from '@music-collection/api';
import { provideI18nTesting } from '@music-collection/core/i18n/testing';

import { RarityOverrideChange } from '../../release-page.store';
import { ReleaseRarityAdminComponent } from './release-rarity-admin.component';

const release = (fields: Partial<ReleaseEntity> = {}): ReleaseEntity =>
	({
		uid: 'rel1',
		rarity: { tier: 'uncommon', source: 'discogs', have: 640 },
		rarityOverride: null,
		...fields,
	}) as unknown as ReleaseEntity;

const overridden = release({
	rarityOverride: {
		tier: 'veryRare',
		note: 'Test pressing',
		byUserId: 'u1',
		at: 1,
	},
});

async function setUp(entity: ReleaseEntity, saving = false) {
	await TestBed.configureTestingModule({
		imports: [ReleaseRarityAdminComponent],
		providers: [provideI18nTesting()],
	}).compileComponents();

	const fixture = TestBed.createComponent(ReleaseRarityAdminComponent);
	const overrides: RarityOverrideChange[] = [];
	let refreshes = 0;

	fixture.componentInstance.override.subscribe((change) =>
		overrides.push(change)
	);
	fixture.componentInstance.refresh.subscribe(() => (refreshes += 1));
	fixture.componentRef.setInput('release', entity);
	fixture.componentRef.setInput('saving', saving);
	fixture.detectChanges();

	return {
		fixture,
		page: fixture.nativeElement as HTMLElement,
		overrides,
		refreshes: () => refreshes,
	};
}

const select = (page: HTMLElement) =>
	page.querySelector('select') as HTMLSelectElement;
const note = (page: HTMLElement) =>
	page.querySelector('textarea') as HTMLTextAreaElement;
const buttons = (page: HTMLElement) =>
	Array.from(page.querySelectorAll('button'));

function write(
	fixture: ComponentFixture<ReleaseRarityAdminComponent>,
	text: string
): void {
	const field = note(fixture.nativeElement);

	field.value = text;
	field.dispatchEvent(new Event('input'));
	fixture.detectChanges();
}

function submit(fixture: ComponentFixture<ReleaseRarityAdminComponent>): void {
	(fixture.nativeElement as HTMLElement)
		.querySelector('form')
		?.dispatchEvent(new Event('submit'));
}

describe('ReleaseRarityAdminComponent', () => {
	it('starts from the worked-out tier and cannot save without a reason', async () => {
		const { fixture, page, overrides } = await setUp(release());

		expect(select(page).value).toBe('uncommon');
		expect(note(page).value).toBe('');
		expect(buttons(page)[0].disabled).toBe(true);
		// Nothing to take back, so only saving and working it out again.
		expect(buttons(page)).toHaveLength(2);

		submit(fixture);

		expect(overrides).toEqual([]);
	});

	it('sends the chosen tier with the trimmed reason', async () => {
		const { fixture, page, overrides } = await setUp(release());

		select(page).value = 'ultraRare';
		select(page).dispatchEvent(new Event('change'));
		write(fixture, '  Signed test pressing ');

		expect(buttons(page)[0].disabled).toBe(false);

		submit(fixture);

		expect(overrides).toEqual([
			{ tier: 'ultraRare', note: 'Signed test pressing' },
		]);
	});

	it("starts from the curator's own tier and can take it back", async () => {
		const { page, overrides } = await setUp(overridden);

		expect(select(page).value).toBe('veryRare');
		expect(note(page).value).toBe('Test pressing');
		expect(buttons(page)).toHaveLength(3);

		buttons(page)[1].click();

		expect(overrides).toEqual([{ tier: null, note: '' }]);
	});

	it('asks for the tier to be worked out again', async () => {
		const { page, refreshes } = await setUp(release());

		buttons(page)[1].click();

		expect(refreshes()).toBe(1);
	});

	it('holds every button while a change is on its way', async () => {
		const { fixture, page, overrides } = await setUp(overridden, true);

		expect(buttons(page).every((button) => button.disabled)).toBe(true);

		submit(fixture);

		expect(overrides).toEqual([]);
	});
});
