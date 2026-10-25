/**
 * The first visit on a phone, which is where the app was found sitting on a
 * black screen for tens of seconds with nothing to say why.
 *
 * Chrome standing in for the phones: the viewport and the user agent are the
 * phone's, the engine is not (Safari's is WebKit). It catches what a layout
 * or a loading state gets wrong at that size; it cannot say how fast a phone
 * is. For the speed, a throttled run or a device farm.
 */
interface Phone {
	name: string;
	width: number;
	height: number;
	userAgent: string;
}

const PHONES: Phone[] = [
	{
		name: 'iPhone 14 (Safari)',
		width: 390,
		height: 844,
		userAgent:
			'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
	},
	{
		name: 'Pixel 7 (Chrome)',
		width: 412,
		height: 915,
		userAgent:
			'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
	},
	{
		name: 'Galaxy S8 (small)',
		width: 360,
		height: 740,
		userAgent:
			'Mozilla/5.0 (Linux; Android 9; SM-G950F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
	},
];

/** How long a first visit may take to show the page, on a fresh profile. */
const FIRST_PAGE_MS = 30_000;

for (const phone of PHONES) {
	describe(`first visit on ${phone.name}`, () => {
		const visit = () =>
			cy.visit('/', {
				onBeforeLoad: (win) => {
					Object.defineProperty(win.navigator, 'userAgent', {
						get: () => phone.userAgent,
					});
				},
			});

		beforeEach(() => {
			cy.viewport(phone.width, phone.height);
		});

		it('is never a blank screen: something says it is loading', () => {
			visit();

			// Straight away, before the app has a chance to start: the shell's
			// own bar, or the app's once it has.
			cy.get('mc-root', { timeout: 2000 }).should('not.be.empty');
			cy.get('[role="progressbar"], .booting, mc-top-bar', {
				timeout: 2000,
			}).should('exist');
		});

		it('does not scroll sideways', () => {
			visit();
			cy.get('mc-top-bar', { timeout: FIRST_PAGE_MS }).should('exist');
			cy.document().then((document) => {
				expect(document.documentElement.scrollWidth).to.be.at.most(
					phone.width
				);
			});
		});

		it('shows the home page, search and a record, in time', () => {
			visit();

			cy.get('input[placeholder]', { timeout: FIRST_PAGE_MS }).should(
				'be.visible'
			);
			cy.get('main img', { timeout: FIRST_PAGE_MS }).should(
				'have.length.at.least',
				1
			);
			// And the loading state is gone once there is something to see.
			cy.get('.booting').should('not.exist');
		});

		it('keeps the thumb bar on the screen', () => {
			visit();
			cy.get('mc-tab-bar', { timeout: FIRST_PAGE_MS })
				.should('be.visible')
				.then(($bar) => {
					const { bottom } = $bar[0].getBoundingClientRect();

					expect(bottom).to.be.at.most(phone.height);
				});
		});
	});
}
