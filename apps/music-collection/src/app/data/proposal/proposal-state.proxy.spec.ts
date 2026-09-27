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
	it('catches the save and proposes instead', () => {
		const real = new CatalogState();
		const proposed: unknown[] = [];
		const proxy = proposalStateProxy(real, (update) =>
			proposed.push(update)
		);

		proxy.dispatchUpdateEntityAction({ uid: 'a1' });

		expect(proposed).toEqual([{ uid: 'a1' }]);
		expect(real.written).toEqual([]);
	});

	it('writes nothing on a create or a delete either', () => {
		const real = new CatalogState();
		const proxy = proposalStateProxy(real, () => undefined);

		proxy.dispatchAddEntityAction({ uid: 'a1' });
		proxy.dispatchDeleteEntityAction({ uid: 'a1' });

		expect(real.written).toEqual([]);
	});

	it('passes every question through, reading the real service own fields', () => {
		const real = new CatalogState();
		const proxy = proposalStateProxy(real, () => undefined);

		expect(proxy.selectEntities$()).toEqual(['Pozvakowski']);
	});
});
