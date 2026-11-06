/**
 * Where the Firebase emulators listen, for the `emulator` build only
 * (`environment.emulator.ts`). The dev and the prod environment leave it
 * `null`, and then nothing connects anywhere but to the real project.
 */
export interface EmulatorHosts {
	host: string;
	auth: number;
	firestore: number;
	functions: number;
	storage: number;
}
