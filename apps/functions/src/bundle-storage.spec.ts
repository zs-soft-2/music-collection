import { Firestore } from 'firebase-admin/firestore';

import { buildBundle } from './bundle-storage';

/** Egy dokumentum-pillanatkép szerver nélkül, ahogy az SDK saját tesztjei is csinálják. */
function snapshot(
	firestore: Firestore,
	id: string,
	value: string,
	readSeconds: number
) {
	const time = { seconds: 1_790_000_000, nanos: 0 };

	return (
		firestore as unknown as {
			snapshot_(
				document: Record<string, unknown>,
				readTime: Record<string, unknown>,
				encoding: string
			): unknown;
		}
	).snapshot_(
		{
			name: `projects/demo/databases/(default)/documents/album/${id}`,
			fields: { name: { stringValue: value } },
			createTime: time,
			updateTime: time,
		},
		{ seconds: readSeconds, nanos: 0 },
		'protobufJS'
	);
}

describe('buildBundle', () => {
	const firestore = new Firestore({ projectId: 'demo' });

	it('bájtra ugyanazt adja, mint az SDK build()-je', () => {
		const make = () => {
			const builder = firestore.bundle('probe');

			for (const [index, name] of [
				'Killers',
				'Piece of Mind',
				'Powerslave',
			].entries()) {
				builder.add(
					snapshot(
						firestore,
						`a${index}`,
						name,
						1_790_000_100 + index
					) as never
				);
			}

			return builder;
		};

		const ours = buildBundle(make());

		expect(ours.equals(make().build())).toBe(true);
		expect(ours.toString('utf8')).toContain('Powerslave');
	});

	it('üres builderre is azonos', () => {
		expect(
			buildBundle(firestore.bundle('empty')).equals(
				firestore.bundle('empty').build()
			)
		).toBe(true);
	});

	it('a bundle ideje a legújabb olvasásé', () => {
		const builder = firestore.bundle('time');

		builder.add(snapshot(firestore, 'x', 'X', 1_790_000_100) as never);
		builder.add(snapshot(firestore, 'y', 'Y', 1_790_000_500) as never);

		expect(buildBundle(builder).toString('utf8')).toContain(
			'"createTime":{"seconds":"1790000500"}'
		);
	});
});
