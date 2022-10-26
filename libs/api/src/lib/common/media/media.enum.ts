export enum MediaEnum {
	vinyl = 'vinyl',
	cd = 'cd',
	dvd = 'dvd',
	cassette = 'cassette',
	all = 'all',
}

export const MediaList: MediaEnum[] = [
	MediaEnum.all,
	MediaEnum.cassette,
	MediaEnum.cd,
	MediaEnum.dvd,
	MediaEnum.vinyl,
];
