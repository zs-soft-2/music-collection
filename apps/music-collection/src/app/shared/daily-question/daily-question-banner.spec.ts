import {
	DailyQuestionBannerState,
	showsBanner,
} from './daily-question-banner.store';

/** Az az állapot, amiben a sávnak fent kell lennie. */
const playable: DailyQuestionBannerState = {
	day: '2026-09-25',
	hasQuestion: true,
	isAnswered: false,
	isSignedIn: true,
	isDismissed: false,
	isOnGamePage: false,
};

describe('showsBanner', () => {
	it('szól, ha van mai kérdés és még nincs tipp', () => {
		expect(showsBanner(playable)).toBe(true);
	});

	it('a tipp után elhallgat', () => {
		expect(showsBanner({ ...playable, isAnswered: true })).toBe(false);
	});

	// „Amíg explicit be nem zárja” — a bezárás a napra szól.
	it('a bezárás után is elhallgat', () => {
		expect(showsBanner({ ...playable, isDismissed: true })).toBe(false);
	});

	it('a játék lapján nem ismétli el magát', () => {
		expect(showsBanner({ ...playable, isOnGamePage: true })).toBe(false);
	});

	it('kijelentkezve nem szól', () => {
		expect(showsBanner({ ...playable, isSignedIn: false })).toBe(false);
	});

	it('kérdés nélküli napon nincs mire emlékeztetni', () => {
		expect(showsBanner({ ...playable, hasQuestion: false })).toBe(false);
	});
});
