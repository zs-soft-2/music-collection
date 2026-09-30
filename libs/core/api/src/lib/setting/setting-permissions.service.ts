import { ActionEnum } from '../action';
import { SettingResourceEnum } from './setting-resource.enum';

export class SettingPermissionsService {
	static readonly updateDefaultLanguage =
		ActionEnum.UPDATE.toString() +
		SettingResourceEnum.DEFAULT_LANGUAGE.toString();
	static readonly updateBadgeGenerationSettings =
		ActionEnum.UPDATE.toString() +
		SettingResourceEnum.BADGE_GENERATION_SETTINGS.toString();
}
