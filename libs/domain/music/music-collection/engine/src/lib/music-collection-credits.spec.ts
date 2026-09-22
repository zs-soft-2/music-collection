import { StyleEnum } from '@music-collection/common/api';
import { MusicCollectionCriteria } from '@music-collection/domain/music-collection/api';

import { creditsNeededFor } from './music-collection-credits';

const rule = (criteria: MusicCollectionCriteria) => ({ criteria });

const styles = rule({ styles: { includesAny: [StyleEnum.Thrash] } });

describe('creditsNeededFor', () => {
	it('needs none while no rule asks who played', () => {
		expect(creditsNeededFor([styles, styles])).toEqual({ kind: 'none' });
	});

	it('needs none when there is no rule at all', () => {
		expect(creditsNeededFor([])).toEqual({ kind: 'none' });
	});

	/*
	 * The case worth having: the credits of one drummer instead of every
	 * credit in the catalog, for exactly the same answer.
	 */
	it('needs only the musicians a rule names', () => {
		expect(
			creditsNeededFor([
				styles,
				rule({ credits: { musicians: ['hoglan'], roles: ['Drums'] } }),
			])
		).toEqual({ kind: 'musicians', musicianUids: ['hoglan'] });
	});

	it('gathers the musicians of every rule, once each and in a fixed order', () => {
		expect(
			creditsNeededFor([
				rule({ credits: { musicians: ['hoglan', 'burns'] } }),
				rule({ credits: { musicians: ['burns', 'araya'] } }),
			])
		).toEqual({
			kind: 'musicians',
			musicianUids: ['araya', 'burns', 'hoglan'],
		});
	});

	/*
	 * "Anything with a producer credit" has no handle to narrow by: the
	 * credit that satisfies it could be anyone's.
	 */
	it('needs all of them for a rule that asks by role alone', () => {
		expect(
			creditsNeededFor([rule({ credits: { roles: ['Producer'] } })])
		).toEqual({ kind: 'all' });
	});

	it('needs all of them for a rule that just wants a credit to exist', () => {
		expect(creditsNeededFor([rule({ credits: {} })])).toEqual({
			kind: 'all',
		});
	});

	/* One rule without a handle decides for the lot; the fetch is shared. */
	it('needs all of them as soon as one rule has no musician to narrow by', () => {
		expect(
			creditsNeededFor([
				rule({ credits: { musicians: ['hoglan'] } }),
				rule({ credits: { roles: ['Producer'] } }),
			])
		).toEqual({ kind: 'all' });
	});

	/*
	 * A rule naming nobody matches nothing — the resolver finds no credit in
	 * an empty list of musicians — so nothing has to be fetched for it to go
	 * on matching nothing.
	 */
	it('fetches nothing for a rule that names an empty list of musicians', () => {
		expect(
			creditsNeededFor([rule({ credits: { musicians: [] } })])
		).toEqual({ kind: 'musicians', musicianUids: [] });
	});
});
