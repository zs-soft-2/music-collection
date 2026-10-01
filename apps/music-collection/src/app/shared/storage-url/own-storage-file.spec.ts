import { ownStorageFileUrl } from './own-storage-file';

const BUCKET = 'music-collection-16676.firebasestorage.app';
const ours = (path: string) =>
	`https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${path}`;

describe('ownStorageFileUrl', () => {
	it('gives back a download URL of the bucket this build uploads to', () => {
		const url = ours('document%2Fcover.png?alt=media&token=abc');

		expect(ownStorageFileUrl(url, BUCKET)).toBe(url);
	});

	/** The token-less shape the avatar and the bundles are written with. */
	it('accepts one without a token', () => {
		const url = ours('document%2Fcover.png?alt=media');

		expect(ownStorageFileUrl(url, BUCKET)).toBe(url);
	});

	/**
	 * The whole point: Storage is one host shared by every Firebase project,
	 * so a file someone else uploaded is one bucket name away from looking
	 * like ours.
	 */
	it('refuses a file another project uploaded', () => {
		const url = ours('x').replace(BUCKET, 'attacker-project.appspot.com');

		expect(ownStorageFileUrl(url, BUCKET)).toBeNull();
	});

	it('refuses a bucket whose name merely starts with ours', () => {
		const url = ours('x').replace(BUCKET, `${BUCKET}.evil.example`);

		expect(ownStorageFileUrl(url, BUCKET)).toBeNull();
	});

	/**
	 * What a check written as a string prefix would have let through: the
	 * host reads as ours up to the `@`, and the browser goes to what follows.
	 */
	it('refuses our host smuggled in as a user name', () => {
		const url =
			'https://firebasestorage.googleapis.com@evil.example' +
			`/v0/b/${BUCKET}/o/x`;

		expect(ownStorageFileUrl(url, BUCKET)).toBeNull();
	});

	it('refuses another host, another scheme, and nonsense alike', () => {
		expect(ownStorageFileUrl('https://evil.example/x', BUCKET)).toBeNull();
		expect(
			ownStorageFileUrl(
				`http://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/x`,
				BUCKET
			)
		).toBeNull();
		expect(ownStorageFileUrl('javascript:alert(1)', BUCKET)).toBeNull();
		expect(ownStorageFileUrl('/document/cover.png', BUCKET)).toBeNull();
	});

	it('refuses an address outside the bucket on the right host', () => {
		expect(
			ownStorageFileUrl(
				'https://firebasestorage.googleapis.com/v0/b/other/o/x',
				BUCKET
			)
		).toBeNull();
	});

	it('has nothing to say about a missing address or a missing bucket', () => {
		expect(ownStorageFileUrl(null, BUCKET)).toBeNull();
		expect(ownStorageFileUrl('', BUCKET)).toBeNull();
		expect(ownStorageFileUrl(ours('x'), '')).toBeNull();
	});
});
