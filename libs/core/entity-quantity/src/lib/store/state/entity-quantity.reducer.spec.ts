import * as entityQuantityActions from './entity-quantity.actions';
import { initialState, reducer } from './entity-quantity.reducer';

describe('entityQuantityReducer – live counts', () => {
	it('marks the counts as loading on request', () => {
		const state = reducer(
			initialState,
			entityQuantityActions.countEntities({ types: ['Artist'] })
		);

		expect(state.countsLoading).toBe(true);
	});

	it('merges the received counts into the earlier ones', () => {
		const withArtists = reducer(
			initialState,
			entityQuantityActions.countEntitiesSuccess({
				counts: { Artist: 684, Track: 10 },
			})
		);
		const state = reducer(
			{ ...withArtists, countsLoading: true },
			entityQuantityActions.countEntitiesSuccess({
				counts: { Track: 6383 },
			})
		);

		expect(state.counts).toEqual({ Artist: 684, Track: 6383 });
		expect(state.countsLoading).toBe(false);
	});

	it('keeps the earlier counts when a request fails', () => {
		const loaded = reducer(
			initialState,
			entityQuantityActions.countEntitiesSuccess({ counts: { Label: 7 } })
		);
		const state = reducer(
			{ ...loaded, countsLoading: true },
			entityQuantityActions.countEntitiesFail({ error: 'offline' })
		);

		expect(state.counts).toEqual({ Label: 7 });
		expect(state.countsLoading).toBe(false);
		expect(state.error).toBe('offline');
	});
});
