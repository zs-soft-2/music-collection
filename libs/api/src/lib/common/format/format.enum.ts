export enum FormatEnum {
	lp = 'lp',
	live = 'live',
	compilation = 'compilation',
	single = 'single',
	maxi = 'maxi',
}

export const FormatList: FormatEnum[] = [
	FormatEnum.compilation,
	FormatEnum.live,
	FormatEnum.lp,
	FormatEnum.maxi,
	FormatEnum.single,
];

export enum FormatDescriptionEnum {
	boxSet = 'box set',
	deluxeEdition = 'deluxe edition',
	g180 = '180g',
	limitedEdition = 'limited edition',
	pictureDisc = 'picture disc',
	reissue = 'reissue',
	remastered = 'remastered',
}

export const FormatDescriptionList: FormatDescriptionEnum[] = [
	FormatDescriptionEnum.boxSet,
	FormatDescriptionEnum.deluxeEdition,
	FormatDescriptionEnum.g180,
	FormatDescriptionEnum.limitedEdition,
	FormatDescriptionEnum.pictureDisc,
	FormatDescriptionEnum.reissue,
	FormatDescriptionEnum.remastered,
];
