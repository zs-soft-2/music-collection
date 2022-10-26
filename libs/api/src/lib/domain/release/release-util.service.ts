import { EntityUtilService } from '../../common';
import {
	ReleaseEntity,
	ReleaseEntityAdd,
	ReleaseEntityUpdate,
} from './release';

export abstract class ReleaseUtilService extends EntityUtilService<
	ReleaseEntity,
	ReleaseEntityAdd,
	ReleaseEntityUpdate
> {}
