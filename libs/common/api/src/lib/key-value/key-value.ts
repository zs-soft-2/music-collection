/**
 * A keyed value. The same shape as Angular's `KeyValue`, kept here so the
 * contracts stay framework-free; named apart from it to avoid an ambiguous
 * import where both are in scope.
 */
export interface KeyValuePair<K, V> {
	key: K;
	value: V;
}
