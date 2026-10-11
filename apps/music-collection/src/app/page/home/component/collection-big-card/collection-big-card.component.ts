import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { CollectionBackdropComponent } from '../../../../shared/collection-backdrop';
import { CollectionEmblemComponent } from '../../../../shared/collection-emblem';
import { CollectionPinComponent } from '../../../../shared/collection-pin';
import { CollectionBigCardView } from '../../home.model';

/**
 * The big card: one collection, drawn large enough to say what this app is
 * for — a set of records somebody drew a line around, what finishing it is
 * worth, how far this shelf gets and who else is after it.
 *
 * The page opens it on the week's collection, and it can be turned to the
 * others from there. The week's one is still the one being talked about —
 * it is the first of them and it does not move until the week does — but a
 * reader the week's set says nothing to can move on without leaving the
 * page. Nothing turns by itself: a panel that changed while it was being
 * read would be a slot machine.
 *
 * The three things the card is made of are the collection's own: its
 * artwork behind the panel, the records themselves turning over in the
 * emblem, and the pin it pays in the ring. The smaller cards under it carry
 * the same three in a smaller frame, so a collection is recognised before
 * it is read.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection-big-card',
	imports: [
		...I18N_IMPORTS,
		RouterLink,
		CollectionBackdropComponent,
		CollectionEmblemComponent,
		CollectionPinComponent,
	],
	template: `
		<section
			class="big-card"
			[class.has-switch]="siblings().length > 1"
			aria-labelledby="big-card-name"
		>
			<!--
				Keyed on the slug: turning the card hands out new elements
				rather than new attributes, so the change plays once on the
				card that arrived and nothing is left to clean up.
			-->
			@for (item of shown(); track item.slug) {
				<mc-collection-backdrop
					shade="hero"
					[coverImageUrl]="item.coverImageUrl"
					[covers]="item.covers"
				/>

				<mc-collection-emblem
					class="emblem"
					[covers]="item.covers"
					[coverImageUrl]="item.coverImageUrl"
					[icon]="item.icon"
					[percentage]="item.percentage"
					[share]="signedIn()"
					[mosaicFirst]="true"
				/>

				<div class="text">
					<p class="eyebrow">
						<i
							class="pi"
							[class.pi-star-fill]="weekly()"
							[class.pi-compass]="!weekly()"
							aria-hidden="true"
						></i>
						{{
							(weekly()
								? 'home.weekly.eyebrow'
								: 'home.weekly.featured'
							) | transloco
						}}
					</p>

					<h1 id="big-card-name">{{ item.name }}</h1>

					@if (item.description) {
						<p class="lead">{{ item.description }}</p>
					}

					<ul class="chips">
						@for (chip of item.chips; track chip) {
							<li>{{ chip }}</li>
						}
						<li>
							{{ item.total | mcPlural: 'home.weekly.albums' }}
						</li>
					</ul>

					<div class="actions">
						<a
							class="button primary"
							[routerLink]="['/collections', item.slug]"
						>
							{{ 'home.weekly.open' | transloco }}
							<i class="pi pi-arrow-right" aria-hidden="true"></i>
						</a>

						<!--
							Taking a collection on needs somebody to take it
							on: "I'm collecting this" said to a guest is a
							claim about a collector who is not there. They are
							asked in, and the star is waiting on the far side.
						-->
						@if (signedIn()) {
							<button
								type="button"
								class="button ghost"
								[class.is-on]="item.followed"
								[attr.aria-pressed]="item.followed"
								(click)="follow.emit()"
							>
								<i
									class="pi"
									[class.pi-star-fill]="item.followed"
									[class.pi-star]="!item.followed"
									aria-hidden="true"
								></i>
								{{
									(item.followed
										? 'home.weekly.collecting'
										: 'home.weekly.collect'
									) | transloco
								}}
							</button>
						} @else {
							<button
								type="button"
								class="button ghost"
								(click)="signIn.emit()"
							>
								<i class="pi pi-sign-in" aria-hidden="true"></i>
								{{ 'home.weekly.signInToCollect' | transloco }}
							</button>
						}
					</div>
				</div>

				<div class="score">
					<!-- A jelvény a kártya sarkában: azért megy a játék. -->
					<mc-collection-pin
						class="pin"
						[badgeArtworkUrl]="item.badgeArtworkUrl"
						[badgeName]="item.badgeName"
						[icon]="item.icon"
						[percentage]="item.percentage"
						[ring]="signedIn()"
						[completed]="item.completed"
					/>

					<p class="points">
						<b>{{ item.points | mcNumber }}</b>
						<span>{{ 'home.weekly.points' | transloco }}</span>
					</p>
					<p class="worth">{{ 'home.weekly.worth' | transloco }}</p>

					@if (item.finishers.length || item.hunters.length) {
						<ul class="faces">
							@for (face of crowd(); track face.uid) {
								<li [attr.title]="face.displayName">
									@if (face.photoURL) {
										<img
											[src]="face.photoURL"
											alt=""
											loading="lazy"
										/>
									} @else {
										<span aria-hidden="true">{{
											face.initial
										}}</span>
									}
								</li>
							}
						</ul>
					}

					<p class="crowd">
						@if (item.finisherCount) {
							<span class="done">{{
								'page.collectors.finishedBy'
									| transloco: { count: item.finisherCount }
							}}</span>
						}
						@if (item.hunterCount) {
							<span>{{
								'page.collectors.collectedBy'
									| transloco: { count: item.hunterCount }
							}}</span>
						}
						@if (!item.finisherCount && !item.hunterCount) {
							<span>{{
								'page.collectors.nobodyYet' | transloco
							}}</span>
						}
					</p>

					<!--
						A haladás a sajátja: egy vendégnek nincs polca, és a
						0% nem róla szól, hanem arról, hogy nincs bejelentkezve.
					-->
					@if (signedIn()) {
						<span
							class="bar"
							role="progressbar"
							[attr.aria-valuenow]="item.percentage"
							aria-valuemin="0"
							aria-valuemax="100"
							[attr.aria-label]="
								'home.weekly.progress' | transloco
							"
						>
							<span
								class="fill"
								[style.width.%]="item.percentage"
							></span>
						</span>

						<p class="counts">
							{{ item.owned }} / {{ item.total }}
						</p>
					}
				</div>
			}

			<!-- Turning the card: the week's collection is always the first. -->
			@if (siblings().length > 1) {
				<nav
					class="switch"
					[attr.aria-label]="'home.weekly.pick' | transloco"
				>
					<button
						type="button"
						class="arrow"
						[attr.aria-label]="'home.weekly.previous' | transloco"
						(click)="previous.emit()"
					>
						<i class="pi pi-chevron-left" aria-hidden="true"></i>
					</button>

					<ul class="dots">
						@for (dot of dots(); track dot.name) {
							<li>
								<button
									type="button"
									class="dot"
									[class.is-on]="dot.at === index()"
									[attr.aria-current]="
										dot.at === index() ? 'true' : null
									"
									[attr.aria-label]="dot.name"
									[attr.title]="dot.name"
									(click)="show.emit(dot.at)"
								></button>
							</li>
						}
					</ul>

					<button
						type="button"
						class="arrow"
						[attr.aria-label]="'home.weekly.next' | transloco"
						(click)="next.emit()"
					>
						<i class="pi pi-chevron-right" aria-hidden="true"></i>
					</button>
				</nav>
			}
		</section>
	`,
	styleUrls: ['./collection-big-card.component.scss'],
})
export class CollectionBigCardComponent {
	public readonly collection = input.required<CollectionBigCardView>();
	/** The one the week belongs to, as opposed to one turned to by hand. */
	public readonly weekly = input(false);
	/** The names of everything the card can be turned to, in order. */
	public readonly siblings = input<string[]>([]);
	/** Which of them is on show. */
	public readonly index = input(0);
	/**
	 * Whether there is a collector behind this reader. A guest has no shelf
	 * to measure — an empty ring with `0%` under it reads as a collection
	 * nobody got anywhere with rather than as nobody being signed in — and
	 * nothing to take a collection on with either.
	 */
	public readonly signedIn = input(true);

	/** Stars the collection, the same way `/collections` does. */
	public readonly follow = output<void>();
	/** A guest asking to sign in, from where the star would have been. */
	public readonly signIn = output<void>();
	public readonly previous = output<void>();
	public readonly next = output<void>();
	/** Turn straight to one of them, from its dot. */
	public readonly show = output<number>();

	/** The one collection on show, as a list the template can key on. */
	protected readonly shown = computed(() => [this.collection()]);

	protected readonly dots = computed(() =>
		this.siblings().map((name, at) => ({ name, at }))
	);

	/** Whoever finished it first, then whoever is after it. */
	protected readonly crowd = computed(() => {
		const item = this.collection();

		return [...item.finishers, ...item.hunters].slice(0, 4);
	});
}
