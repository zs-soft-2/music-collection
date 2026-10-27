import { ActionEnum } from '../../../core';
import { TrackResourceEnum } from './track-resource.enum';

export class TrackPermissionsService {
	static readonly createTrackEntity =
		ActionEnum.CREATE.toString() +
		TrackResourceEnum.TRACK_ENTITY.toString();
	static readonly deleteTrackEntity =
		ActionEnum.DELETE.toString() +
		TrackResourceEnum.TRACK_ENTITY.toString();
	static readonly updateTrackEntity =
		ActionEnum.UPDATE.toString() +
		TrackResourceEnum.TRACK_ENTITY.toString();
	static readonly viewTrackEntity =
		ActionEnum.VIEW.toString() + TrackResourceEnum.TRACK_ENTITY.toString();
}
