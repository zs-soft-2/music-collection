import { ALBUM_VIEW_SETTING } from './album-view.setting';

describe('ALBUM_VIEW_SETTING', () => {
	it('leaves the layout unchosen without a document', () => {
		expect(ALBUM_VIEW_SETTING.toValue({})).toEqual({ compact: null });
	});

	it('reads the flag of the account document', () => {
		expect(ALBUM_VIEW_SETTING.toValue({ compact: true })).toEqual({
			compact: true,
		});
	});

	it('still reads the bare flag the browser kept', () => {
		expect(ALBUM_VIEW_SETTING.toValue(true as never)).toEqual({
			compact: true,
		});
	});
});
