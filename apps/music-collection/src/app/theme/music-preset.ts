import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

// A PrimeNG-komponensek a zenei téma palettáján: piros elsődleges szín,
// semleges felületek. A színek light-dark() párok, így a <html> color-scheme
// értéke (ThemeService) egyszerre váltja a PrimeNG-t és a --mc-* tokeneket.
export const MusicPreset = definePreset(Aura, {
	primitive: {
		borderRadius: {
			none: '0',
			xs: '2px',
			sm: '4px',
			md: '8px',
			lg: '8px',
			xl: '12px',
		},
	},
	semantic: {
		primary: {
			50: '#fff1f1',
			100: '#ffe0e0',
			200: '#ffc5c5',
			300: '#ff9d9d',
			400: '#ff6464',
			500: '#ff4444',
			600: '#e02d2d',
			700: '#bb1f1f',
			800: '#9a1d1d',
			900: '#801e1e',
			950: '#460b0b',
			color: 'light-dark(#e02d2d, #ff4444)',
			contrastColor: 'light-dark(#ffffff, #0a0a0a)',
			hoverColor: 'light-dark(#bb1f1f, #ff6464)',
			activeColor: 'light-dark(#9a1d1d, #ff9d9d)',
		},
		surface: {
			0: '#ffffff',
			50: 'light-dark(#f7f7f8, #f5f5f5)',
			100: 'light-dark(#f0f0f2, #e8e8e8)',
			200: 'light-dark(#e2e2e5, #cfcfcf)',
			300: 'light-dark(#c4c4c8, #b8b8b8)',
			400: 'light-dark(#8a8a8a, #a0a0a0)',
			500: 'light-dark(#4a4a4a, #7a7a7a)',
			600: 'light-dark(#2e2e2e, #3a3a3a)',
			700: 'light-dark(#0a0a0a, #2a2a2a)',
			800: 'light-dark(#050505, #1e1e1e)',
			900: 'light-dark(#050505, #161616)',
			950: 'light-dark(#000000, #0a0a0a)',
		},
		focusRing: {
			width: '2px',
			style: 'solid',
			color: 'light-dark(#0091b3, #00d4ff)',
			offset: '2px',
			shadow: 'none',
		},
		highlight: {
			background: 'color-mix(in srgb, {primary.color}, transparent 86%)',
			focusBackground:
				'color-mix(in srgb, {primary.color}, transparent 78%)',
			color: '{text.color}',
			focusColor: '{text.color}',
		},
	},
});
