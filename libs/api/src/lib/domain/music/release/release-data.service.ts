import { FirebaseDataService } from '../../../core';
import { ReleaseModel, ReleaseModelAdd, ReleaseModelUpdate } from './release';

export abstract class ReleaseDataService extends FirebaseDataService<
	ReleaseModel,
	ReleaseModelAdd,
	ReleaseModelUpdate
> {}
