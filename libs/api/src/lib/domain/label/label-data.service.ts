import { FirebaseDataService } from '../../core';
import { LabelModel, LabelModelAdd, LabelModelUpdate } from './label';

export abstract class LabelDataService extends FirebaseDataService<
	LabelModel,
	LabelModelAdd,
	LabelModelUpdate
> {}
