/**
 * The envelope every worker in the app speaks. Kept apart from the bridge
 * that uses it so a worker can import the types without pulling the DOM —
 * and the browser half of the app — into its own bundle.
 */

/** What is posted to the worker. */
export interface WorkerRequest<T> {
	id: number;
	payload: T;
}

/** What the worker posts back. */
export interface WorkerReply<T> {
	id: number;
	payload?: T;
	error?: string;
}
