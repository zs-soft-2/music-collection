import { proposalStateProxy } from './proposal-state.proxy';

/** A state service the way the catalog's are written, private field and all. */
class CatalogState {
	private readonly held = ['Pozvakowski'];

	public written: unknown[] = [];

	public dispatchUpdateEntityAction(entity: unknown): void {
		this.written.push(entity);
	}

	public dispatchAddEntityAction(entity: unknown): void {
		this.written.push(entity);
	}

	public dispatchDeleteEntityAction(entity: unknown): void {
		this.written.push(entity);
	}

	public selectEntities$(): string[] {
		return this.held;
	}
}

describe('proposalStateProxy', () => {
	const handlers = () => {
		const updated: unknown[] = [];
		const created: unknown[] = [];

		return {
			updated,
			created,
			handlers: {
				update: (entity: unknown) => updated.push(entity),
				create: (entity: unknown) => created.push(entity),
			},
		};
	};

	it('catches the save of a change and proposes instead', () => {
		const real = new CatalogState();
		const { updated, handlers: caught } = handlers();
		const proxy = proposalStateProxy(real, caught);

		proxy.dispatchUpdateEntityAction({ uid: 'a1' });

		expect(updated).toEqual([{ uid: 'a1' }]);
		expect(real.written).toEqual([]);
	});

	it('catches a new entity the same way', () => {
		const real = new CatalogState();
		const { created, handlers: caught } = handlers();
		const proxy = proposalStateProxy(real, caught);

		proxy.dispatchAddEntityAction({ name: 'Pozvakowski' });

		expect(created).toEqual([{ name: 'Pozvakowski' }]);
		expect(real.written).toEqual([]);
	});

	it('writes nothing on a delete, and proposes nothing either', () => {
		const real = new CatalogState();
		const { updated, created, handlers: caught } = handlers();
		const proxy = proposalStateProxy(real, caught);

		proxy.dispatchDeleteEntityAction({ uid: 'a1' });

		expect(real.written).toEqual([]);
		expect([...updated, ...created]).toEqual([]);
	});

	it('passes every question through, reading the real service own fields', () => {
		const real = new CatalogState();
		const proxy = proposalStateProxy(real, handlers().handlers);

		expect(proxy.selectEntities$()).toEqual(['Pozvakowski']);
	});
});
