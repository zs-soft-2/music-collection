import { FormGroup } from '@angular/forms';

import { BaseService } from '../base';
import {
	ParamItem,
	QueryConstraintTypeEnum,
	QueryOperatorEnum,
	SearchParam,
	SearchParams,
} from '../search';
import { EntityTypeEnum } from './entity-type.enum';

export abstract class EntityUtilService<R, S, T> extends BaseService {
	public createSearchParameters(name: string): string[] {
		const searchOptions: string[] = [];
		let temp = '';

		for (let i = 0; i < name.length; i++) {
			temp = temp + name[i].toLowerCase();

			searchOptions.push(temp);
		}

		return searchOptions;
	}

	public createSearchParams(
		entityType: EntityTypeEnum,
		term: string
	): SearchParams {
		const query: ParamItem<string> = {
			queryConstraint: QueryConstraintTypeEnum.where,
			operation: QueryOperatorEnum.arrayContains,
			field: 'searchParameters',
			value: term.toLowerCase(),
		};

		const searchParams: SearchParams = [{ entityType, query }];

		return searchParams;
	}

	public createSearchParam(
		entityType: EntityTypeEnum,
		term: string,
		queryConstraint: QueryConstraintTypeEnum,
		operation: QueryOperatorEnum,
		field: string
	): SearchParam {
		const query: ParamItem<string> = {
			queryConstraint,
			operation,
			field,
			value: term,
		};

		const searchParam: SearchParam = { entityType, query };

		return searchParam;
	}

	public abstract _sort(a: R, b: R): number;
	public abstract createEntity(formGroup: FormGroup): S;
	public abstract createFormGroup(entity: R | undefined): FormGroup;
	public abstract updateEntity(formGroup: FormGroup): T;
}
