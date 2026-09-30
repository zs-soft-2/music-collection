/**
 * A rendszer beállításai mint jogosultsági erőforrás. Nem entitások (nincs
 * belőlük több, nem születnek és nem halnak), ezért a nevük sem `…Entity`-re
 * végződik, és csak módosítani lehet őket.
 */
export enum SettingResourceEnum {
	DEFAULT_LANGUAGE = 'DefaultLanguage',
	BADGE_GENERATION_SETTINGS = 'BadgeGenerationSettings',
}
