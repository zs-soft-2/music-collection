import { FirebaseDataService } from '../../../core';
import {
	MusicianModel,
	MusicianModelAdd,
	MusicianModelUpdate,
} from './musician';

export abstract class MusicianDataService extends FirebaseDataService<
	MusicianModel,
	MusicianModelAdd,
	MusicianModelUpdate
> {}
