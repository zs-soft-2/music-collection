export const environment = {
	production: false,
	firebase: {
		apiKey: 'AIzaSyDHWO8_DhKXayoJc_eThKVwm2LzLBw9J5w',
		authDomain: 'music-collection-4e074.firebaseapp.com',
		projectId: 'music-collection-4e074',
		storageBucket: 'music-collection-4e074.appspot.com',
		messagingSenderId: '110722700843',
		appId: '1:110722700843:web:2b53358337e0976ba87c6e',
		measurementId: 'G-7H6CC1PTSY',
	},
	spotify: {
		/**
		 * Client ID of the Spotify app (developer.spotify.com/dashboard) for
		 * full playback on the album page. Not a secret (PKCE flow). Empty
		 * leaves only the embedded preview player.
		 */
		clientId: '0ab3fba0933440238c563c337700db27',
	},
	type: '', //'develop' or '',
	version: '1.0.0',
};
