import { COLLECTION_VIEW_SETTING } from './collection-view.setting';

describe('COLLECTION_VIEW_SETTING', () => {
	it('leaves the layout unchosen without a document', () => {
		expect(COLLECTION_VIEW_SETTING.toValue({})).toEqual({
			sort: null,
			group: null,
			view: null,
		});
	});

	it('reads a stored layout', () => {
		expect(
			COLLECTION_VIEW_SETTING.toValue({
				sort: 'added',
				group: 'decade',
				view: 'shelf',
			})
		).toEqual({ sort: 'added', group: 'decade', view: 'shelf' });
	});

	it('drops an option that no longer exists', () => {
		expect(
			COLLECTION_VIEW_SETTING.toValue({
				sort: 'by-colour',
				group: 'none',
				view: 'grid',
			})
		).toEqual({ sort: null, group: 'none', view: 'grid' });
	});
});
