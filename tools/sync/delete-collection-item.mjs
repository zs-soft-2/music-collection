/** Removes one collection-item document the way the app's wrapper does. */
import { parseArgs } from 'node:util';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { ENV_OPTION, readEnvironment } from './environment.mjs';
import { tombstone, touchCatalog } from './catalog-sync.mjs';

const { values: options } = parseArgs({
	options: {
		env: ENV_OPTION,
		path: { type: 'string' },
		confirm: { type: 'boolean', default: false },
	},
});
const { projectId } = await readEnvironment(options.env);
initializeApp({ credential: applicationDefault(), projectId });
const db = getFirestore();
const ref = db.doc(options.path);
const snapshot = await ref.get();

if (!snapshot.exists) throw new Error(`no such document: ${options.path}`);
const data = snapshot.data();
console.log(`${projectId}: delete ${ref.path}`);
console.log(
	JSON.stringify(
		{
			uid: data.uid,
			title: data.release?.name,
			releaseUid: data.release?.uid,
			date: data.date,
			disposal: data.disposal ?? null,
		},
		null,
		1
	)
);
if (!options.confirm) {
	console.log('DRY RUN — add --confirm to write');
	process.exit(0);
}

const stone = tombstone(db, ref);
const batch = db.batch();
batch.delete(ref);
batch.set(stone.ref, stone.data);
await batch.commit();
await touchCatalog(db, ['collection-item']);
console.log(`deleted, tombstone ${stone.ref.path}, collection-item touched`);
