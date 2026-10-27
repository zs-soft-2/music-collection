import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	linkedSignal,
} from '@angular/core';

/** How many covers stand behind a card: the same square the emblem draws. */
const WALL = 4;

/**
 * The picture a collection's card is drawn on.
 *
 * Two different pictures end up here and they are not treated alike. The
 * curator's artwork is a picture somebody made for this collection — often
 * paid for a frame at a time — so it is shown: sharp, barely darkened, and
 * shaded only where the words stand. The wall of covers, which stands in
 * where there is no artwork, is a surface rather than a picture: four
 * unrelated squares butted together only read as a set once they are
 * blurred into one colour.
 *
 * They stand still. The mosaic that walks the whole collection belongs to
 * `mc-collection-emblem`, which is a picture meant to be looked at; two of
 * them moving on one card would be the same set turning over in two places.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection-backdrop',
	template: `
		@if (artwork(); as url) {
			<img [src]="url" alt="" loading="lazy" (error)="onBroken()" />
		} @else if (wall().length) {
			<span class="wall" [attr.data-count]="wall().length">
				@for (cover of wall(); track cover) {
					<img [src]="cover" alt="" loading="lazy" />
				}
			</span>
		}
		<span class="shade"></span>
	`,
	/*
	 * Attribútum, nem osztály: a host a befoglaló lap sablonjába tartozik,
	 * így a lap saját `.hero`-ja ráillene egy ilyen nevű osztályra, és a
	 * háttérből a lap gridje lenne. A `data-source` ugyanitt mondja meg,
	 * melyik kép áll mögötte, mert a kettő más homályt és más fedést kap.
	 */
	host: {
		'aria-hidden': 'true',
		'[attr.data-shade]': 'shade()',
		'[attr.data-source]': 'source()',
	},
	styles: `
		:host {
			position: absolute;
			inset: 0;
			overflow: hidden;
			pointer-events: none;
			border-radius: inherit;
		}

		img {
			display: block;
			width: 100%;
			height: 100%;
			object-fit: cover;
		}

		/*
		 * A borítófal homálya a képre együtt megy, nem képenként: négy külön
		 * elmosott borító között látszana a varrat, egyben viszont egyetlen
		 * színfolt lesz belőlük. A kép túl is nyúlik a kártyán, különben a
		 * széleken kifakulna.
		 *
		 * Felhúzva nincs: a borítók nem sötétek, és egy elmosott, kivilágított
		 * négyes a sötét lapon tejes ködnek látszik, nem háttérnek. A felhúzás
		 * a kurátor képéé, mert azt rajzolta valami, ami szeret sötétben.
		 */
		.wall {
			filter: blur(var(--mc-backdrop-blur, 22px))
				saturate(var(--mc-backdrop-saturate, 130%))
				brightness(var(--mc-backdrop-brightness, 1));
			transform: scale(1.15);
		}

		/*
		 * A kurátor képe élesen áll: ez az egy kép a kollekcióról szól, és
		 * elmosva ugyanaz a semmitmondó színfolt lenne, mint bármelyik
		 * másiké. Amit kap, az egy hajszálnyi felhúzás — a képmodell
		 * rajzolta hátterek fele sötét —, a sötétítés pedig mind a fedésé,
		 * mert az kiszámítható, a kép tartalma nem az.
		 */
		:host > img {
			filter: blur(var(--mc-backdrop-art-blur, 0px))
				saturate(var(--mc-backdrop-art-saturate, 112%))
				brightness(var(--mc-backdrop-art-brightness, 1.06));
		}

		.shade {
			position: absolute;
			inset: 0;
			background: var(
				--mc-backdrop-shade,
				linear-gradient(
					0deg,
					rgba(10, 10, 10, 0.95) 0%,
					rgba(10, 10, 10, 0.84) 42%,
					rgba(10, 10, 10, 0.5) 72%,
					rgba(10, 10, 10, 0.3) 100%
				)
			);
		}

		/*
		 * A kis kártyán a szöveg az alsó sávban ül, tehát csak az alja kell
		 * sötét: fölötte a kép látszik, nem sejlik.
		 */
		:host([data-source='artwork']) .shade {
			background: var(
				--mc-backdrop-art-shade,
				linear-gradient(
					0deg,
					rgba(10, 10, 10, 0.94) 0%,
					rgba(10, 10, 10, 0.78) 34%,
					rgba(10, 10, 10, 0.28) 62%,
					rgba(10, 10, 10, 0.08) 100%
				)
			);
		}

		/*
		 * A hero árnyéka a bal oldal felé sötétedik: ott áll a név és a
		 * pont, és ott kell a legtöbb kontraszt. A borítófal a panel
		 * szélességében egyetlen sápadt folttá nyúlik, ezért a jobb oldala
		 * sem enged fel egészen: elmosott borítóból így sötét színezet lesz,
		 * nem köd a lap tetején. A kurátor képe alább mást kap.
		 */
		:host([data-shade='hero']) .shade {
			background: var(
				--mc-backdrop-hero-shade,
				radial-gradient(
					130% 110% at 0% 50%,
					rgba(10, 10, 10, 0.92) 0%,
					rgba(10, 10, 10, 0.78) 40%,
					rgba(10, 10, 10, 0.58) 100%
				),
				linear-gradient(
					0deg,
					rgba(10, 10, 10, 0.62) 0%,
					transparent 50%
				)
			);
		}

		/*
		 * A kurátor képe a nagy panelen: a két szélén marad fedés, mert ott
		 * áll a név és a pontszám, középen viszont nyitva marad egy sáv,
		 * ahol a kép tényleg látszik. A szöveg a maga árnyékát hozza.
		 */
		:host([data-shade='hero'][data-source='artwork']) .shade {
			background: var(
				--mc-backdrop-hero-art-shade,
				radial-gradient(
					120% 130% at 0% 50%,
					rgba(10, 10, 10, 0.88) 0%,
					rgba(10, 10, 10, 0.52) 34%,
					rgba(10, 10, 10, 0) 70%
				),
				radial-gradient(
					80% 120% at 100% 50%,
					rgba(10, 10, 10, 0.72) 0%,
					rgba(10, 10, 10, 0.3) 45%,
					rgba(10, 10, 10, 0) 80%
				),
				linear-gradient(0deg, rgba(10, 10, 10, 0.5) 0%, transparent 55%)
			);
		}
	`,
})
export class CollectionBackdropComponent {
	/** Artwork the curator gave the collection; it goes first. */
	public readonly coverImageUrl = input<string | null>(null);
	/** Covers of its records, for a collection with no artwork of its own. */
	public readonly covers = input<string[]>([]);
	/**
	 * How dark it goes and from which side. `hero` is the big panel, where
	 * the text stands to the left of a wide picture; `card` is the small
	 * one, where everything is read off the bottom edge.
	 */
	public readonly shade = input<'card' | 'hero'>('card');

	/**
	 * The artwork could not be fetched. A curator's picture is one file on
	 * one server, and a card that stands on a broken one would be a black
	 * panel — the records are right here, so they take over.
	 *
	 * Keyed on the url, so a card rebound to another collection tries that
	 * collection's picture rather than inheriting this one's failure.
	 */
	private readonly broken = linkedSignal<string | null, boolean>({
		source: this.coverImageUrl,
		computation: () => false,
	});

	/** The curator's picture, while it still loads. */
	protected readonly artwork = computed(() =>
		this.broken() ? null : this.coverImageUrl()
	);

	/** The records standing in for a collection with no artwork. */
	protected readonly wall = computed(() => this.covers().slice(0, WALL));

	/** Which of the two pictures is behind the card, for the styles. */
	protected readonly source = computed(() => {
		if (this.artwork()) {
			return 'artwork';
		}

		return this.wall().length ? 'wall' : 'none';
	});

	protected onBroken(): void {
		this.broken.set(true);
	}
}
