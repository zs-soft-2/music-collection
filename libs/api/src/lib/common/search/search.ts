import { EntityTypeEnum } from '../entity';

export interface Searchable {
	searchParameters: string[];
}

export interface SearchParam {
	entityType: EntityTypeEnum;
	query: ParamItem<unknown>;
}

export interface ParamItem<T> {
	field: string;
	queryConstraint: QueryConstraintTypeEnum;
	operation: QueryOperatorEnum;
	value: T;
}

export type SearchParams = SearchParam[];

export enum QueryOperatorEnum {
	less = '<',
	lessEqual = '<=',
	equal = '==',
	notEqual = '!=',
	greaterEqual = '>=',
	greater = '>',
	arrayContains = 'array-contains',
	in = 'in',
	arrayContainsAny = 'array-contains-any',
	notIn = 'not-in',
}

export enum QueryConstraintTypeEnum {
	where = 'where',
	orderBy = 'orderBy',
	limit = 'limit',
	limitToLast = 'limitToLast',
	startAt = 'startAt',
	startAfter = 'startAfter',
	endAt = 'endAt',
	endBefore = 'endBefore',
}
