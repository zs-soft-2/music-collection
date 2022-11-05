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
	pictureDisc = 'picture disc',
	limitedEdition = 'limited edition',
	reissue = 'reissue',
	remastered = 'remastered',
	g180 = '180g',
}

export const FormatDescriptionList: FormatDescriptionEnum[] = [
	FormatDescriptionEnum.limitedEdition,
	FormatDescriptionEnum.pictureDisc,
	FormatDescriptionEnum.reissue,
	FormatDescriptionEnum.remastered,
	FormatDescriptionEnum.g180,
];
