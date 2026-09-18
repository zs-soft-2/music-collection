/** Egy jelentett hiba, akárhonnan is származik. */
export interface AppError {
	uid: string;
	/** A felhasználónak szánt üzenet. */
	message: string;
	/** Honnan jött: akció típusa, `ErrorHandler` vagy `unhandledrejection`. */
	source: string;
	/** A konzolba írt részletek, ha van (stack, kód). */
	detail?: string;
	reportedAt: number;
}
