import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { DailyQuestionSettingsStore } from './daily-question-settings.store';

/**
 * Admin: the rules of the daily question.
 *
 * What is set here takes effect with the next question composed — the day's
 * clock, points and multiplier are written into the question when it is made,
 * so an admin changing the points at noon does not make the morning's guesses
 * worth less than the afternoon's. The button at the bottom composes a
 * question by hand for anybody who does not want to wait for midnight.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-daily-question-settings',
	providers: [DailyQuestionSettingsStore],
	imports: [...I18N_IMPORTS],
	template: `
		<header class="mc-page-head">
			<div>
				<h1>{{ 'ui.dailyQuestionSettings.title' | transloco }}</h1>
				<p>{{ 'ui.dailyQuestionSettings.lead' | transloco }}</p>
			</div>
		</header>

		@if (store.error(); as error) {
			<p class="error" role="alert">{{ error }}</p>
		}

		@if (store.isLoading()) {
			<div class="skeleton" role="status" aria-busy="true">
				<span class="visually-hidden">{{
					'ui.dailyQuestionSettings.loading' | transloco
				}}</span>
			</div>
		} @else {
			@let settings = store.settings();

			<div class="mc-form">
				<section class="mc-form-section">
					<h2>
						{{ 'ui.dailyQuestionSettings.the-game' | transloco }}
					</h2>

					<div class="mc-form-grid">
						<div class="mc-field is-wide">
							<label class="switch">
								<input
									type="checkbox"
									[checked]="settings.enabled"
									(change)="
										store.set({ enabled: checked($event) })
									"
								/>
								<span>{{
									'ui.dailyQuestionSettings.game-is-on'
										| transloco
								}}</span>
							</label>
							<small>{{
								'ui.dailyQuestionSettings.switched-off'
									| transloco
							}}</small>
						</div>

						<div class="mc-field">
							<label for="time-limit">{{
								'ui.dailyQuestionSettings.time-limit'
									| transloco
							}}</label>
							<input
								id="time-limit"
								type="number"
								min="0"
								max="600"
								[value]="settings.timeLimitSec"
								(input)="
									store.setNumber(
										'timeLimitSec',
										value($event)
									)
								"
							/>
							<small>{{
								'ui.dailyQuestionSettings.time-limit-hint'
									| transloco
							}}</small>
						</div>
					</div>
				</section>

				<section class="mc-form-section">
					<h2>
						{{
							'ui.dailyQuestionSettings.what-a-guess-pays'
								| transloco
						}}
					</h2>

					<div class="mc-form-grid">
						<div class="mc-field">
							<label for="points-easy">{{
								'ui.dailyQuestionSettings.points-easy'
									| transloco
							}}</label>
							<input
								id="points-easy"
								type="number"
								min="0"
								max="1000"
								[value]="settings.points.easy"
								(input)="store.setPoints('easy', value($event))"
							/>
						</div>

						<div class="mc-field">
							<label for="points-medium">{{
								'ui.dailyQuestionSettings.points-medium'
									| transloco
							}}</label>
							<input
								id="points-medium"
								type="number"
								min="0"
								max="1000"
								[value]="settings.points.medium"
								(input)="
									store.setPoints('medium', value($event))
								"
							/>
						</div>

						<div class="mc-field">
							<label for="points-hard">{{
								'ui.dailyQuestionSettings.points-hard'
									| transloco
							}}</label>
							<input
								id="points-hard"
								type="number"
								min="0"
								max="1000"
								[value]="settings.points.hard"
								(input)="store.setPoints('hard', value($event))"
							/>
						</div>

						<div class="mc-field">
							<label for="streak-bonus">{{
								'ui.dailyQuestionSettings.streak-bonus'
									| transloco
							}}</label>
							<input
								id="streak-bonus"
								type="number"
								min="0"
								max="100"
								[value]="settings.streakBonusPerDay"
								(input)="
									store.setNumber(
										'streakBonusPerDay',
										value($event)
									)
								"
							/>
							<small>{{
								'ui.dailyQuestionSettings.streak-bonus-hint'
									| transloco
							}}</small>
						</div>

						<div class="mc-field">
							<label for="streak-days">{{
								'ui.dailyQuestionSettings.streak-days'
									| transloco
							}}</label>
							<input
								id="streak-days"
								type="number"
								min="0"
								max="60"
								[value]="settings.maxStreakBonusDays"
								(input)="
									store.setNumber(
										'maxStreakBonusDays',
										value($event)
									)
								"
							/>
						</div>

						<div class="mc-field">
							<label for="speed-bonus">{{
								'ui.dailyQuestionSettings.speed-bonus'
									| transloco
							}}</label>
							<input
								id="speed-bonus"
								type="number"
								min="0"
								max="500"
								[value]="settings.speedBonusMax"
								(input)="
									store.setNumber(
										'speedBonusMax',
										value($event)
									)
								"
							/>
							<small>{{
								'ui.dailyQuestionSettings.speed-bonus-hint'
									| transloco
							}}</small>
						</div>
					</div>
				</section>

				<section class="mc-form-section">
					<h2>
						{{ 'ui.dailyQuestionSettings.the-luck' | transloco }}
					</h2>

					<div class="mc-form-grid">
						<div class="mc-field">
							<label for="bonus-chance">{{
								'ui.dailyQuestionSettings.bonus-day-chance'
									| transloco
							}}</label>
							<input
								id="bonus-chance"
								type="number"
								min="0"
								max="100"
								[value]="store.bonusDayPercent()"
								(input)="store.setBonusPercent(value($event))"
							/>
							<small>{{
								'ui.dailyQuestionSettings.bonus-day-chance-hint'
									| transloco
							}}</small>
						</div>

						<div class="mc-field">
							<label for="bonus-multiplier">{{
								'ui.dailyQuestionSettings.bonus-day-multiplier'
									| transloco
							}}</label>
							<input
								id="bonus-multiplier"
								type="number"
								min="1"
								max="10"
								[value]="settings.bonusDayMultiplier"
								(input)="
									store.setNumber(
										'bonusDayMultiplier',
										value($event)
									)
								"
							/>
						</div>
					</div>
				</section>

				<section class="mc-form-section">
					<h2>
						{{
							'ui.dailyQuestionSettings.question-kinds'
								| transloco
						}}
						<span class="count">{{
							'ui.dailyQuestionSettings.enabled-count'
								| transloco
									: {
											enabled: store.enabledCount(),
											all: store.templates().length,
									  }
						}}</span>
					</h2>
					<p class="section-hint">
						{{
							'ui.dailyQuestionSettings.question-kinds-hint'
								| transloco
						}}
					</p>

					<ul class="templates">
						@for (
							template of store.templateRows();
							track template.key
						) {
							<li [class]="'is-' + template.difficulty">
								<label class="switch">
									<input
										type="checkbox"
										[checked]="template.enabled"
										(change)="
											store.toggleTemplate(
												template.key,
												checked($event)
											)
										"
									/>
									<span class="template-key">{{
										template.key
									}}</span>
								</label>
								<span class="template-difficulty">{{
									difficultyPrefix + template.difficulty
										| transloco
								}}</span>
								<span class="template-frame">{{
									templatePrefix + template.key
										| transloco: sampleParams
								}}</span>
							</li>
						}
					</ul>
				</section>

				<section class="mc-form-section">
					<h2>
						{{ 'ui.dailyQuestionSettings.the-field' | transloco }}
					</h2>

					<div class="mc-form-grid">
						<div class="mc-field">
							<label for="leaderboard-size">{{
								'ui.dailyQuestionSettings.leaderboard-size'
									| transloco
							}}</label>
							<input
								id="leaderboard-size"
								type="number"
								min="1"
								max="100"
								[value]="settings.leaderboardSize"
								(input)="
									store.setNumber(
										'leaderboardSize',
										value($event)
									)
								"
							/>
							<small>{{
								'ui.dailyQuestionSettings.leaderboard-size-hint'
									| transloco
							}}</small>
						</div>
					</div>
				</section>

				<div class="mc-form-actions">
					<button
						type="button"
						class="primary"
						[disabled]="!store.canSave()"
						(click)="store.save()"
					>
						{{
							(store.isSaving()
								? 'ui.dailyQuestionSettings.saving'
								: 'ui.dailyQuestionSettings.save'
							) | transloco
						}}
					</button>
					@if (store.savedAt()) {
						<span class="saved" role="status">{{
							'ui.dailyQuestionSettings.saved' | transloco
						}}</span>
					}
				</div>

				<section class="mc-form-section">
					<h2>
						{{ 'ui.dailyQuestionSettings.today' | transloco }}
						<span class="count">{{ store.today() }}</span>
					</h2>

					<div class="mc-form-actions">
						<button
							type="button"
							[disabled]="store.isComposing()"
							(click)="store.compose(false)"
						>
							{{
								(store.isComposing()
									? 'ui.dailyQuestionSettings.composing'
									: 'ui.dailyQuestionSettings.compose-now'
								) | transloco
							}}
						</button>
						<button
							type="button"
							[disabled]="store.isComposing()"
							(click)="store.compose(true)"
						>
							{{
								'ui.dailyQuestionSettings.compose-force'
									| transloco
							}}
						</button>
						<button
							type="button"
							[disabled]="store.isRefreshing()"
							(click)="store.refreshLeaderboard()"
						>
							{{
								(store.isRefreshing()
									? 'ui.dailyQuestionSettings.refreshing'
									: 'ui.dailyQuestionSettings.refresh-leaderboard'
								) | transloco
							}}
						</button>
					</div>

					@if (store.composed(); as composed) {
						<p class="outcome" role="status">
							@switch (composed.reason) {
								@case ('created') {
									{{
										'ui.dailyQuestionSettings.composed'
											| transloco
												: {
														day: composed.day,
														template:
															composed.templateKey,
														difficulty:
															composed.difficulty,
														tries: composed.tries,
												  }
									}}
								}
								@case ('exists') {
									{{
										'ui.dailyQuestionSettings.compose-exists'
											| transloco: { day: composed.day }
									}}
								}
								@case ('disabled') {
									{{
										'ui.dailyQuestionSettings.compose-disabled'
											| transloco
									}}
								}
								@default {
									{{
										'ui.dailyQuestionSettings.compose-no-material'
											| transloco
									}}
								}
							}
						</p>
					}

					@if (store.refreshed(); as refreshed) {
						<p class="outcome" role="status">
							{{
								'ui.dailyQuestionSettings.leaderboard-refreshed'
									| transloco
										: {
												players: refreshed.players,
												ranked: refreshed.ranked,
										  }
							}}
						</p>
					}
				</section>

				<!--
					What the game has been asking. The questions are public
					documents — the answer is not in them — so this is read
					straight from Firestore, and says what the collector read.
				-->
				<section class="mc-form-section">
					<h2>
						{{ 'ui.dailyQuestionSettings.history' | transloco }}
						<span class="count">{{ store.history().length }}</span>
					</h2>
					<p class="section-hint">
						{{
							'ui.dailyQuestionSettings.history-hint' | transloco
						}}
					</p>

					@if (store.isHistoryLoading()) {
						<div class="skeleton" role="status" aria-busy="true">
							<span class="visually-hidden">{{
								'ui.dailyQuestionSettings.loading' | transloco
							}}</span>
						</div>
					} @else if (store.historyRows().length) {
						<ol class="history">
							@for (row of store.historyRows(); track row.day) {
								<li>
									<span class="history-day">{{
										row.day
									}}</span>
									<span class="template-key">{{
										row.templateKey
									}}</span>
									<span class="template-difficulty">{{
										difficultyPrefix + row.difficulty
											| transloco
									}}</span>
									<span class="history-question">{{
										row.frame.key
											| transloco: row.frame.params
									}}</span>
								</li>
							}
						</ol>
					} @else {
						<p class="outcome">
							{{
								'ui.dailyQuestionSettings.history-empty'
									| transloco
							}}
						</p>
					}
				</section>
			</div>
		}
	`,
	styles: `
		.switch {
			display: inline-flex;
			align-items: center;
			gap: 0.5rem;
		}

		.count {
			margin-left: 0.6rem;
			font-size: 0.8rem;
			font-weight: 400;
			color: var(--mc-text-subtle);
		}

		.section-hint {
			max-width: 70ch;
			margin: 0 0 1rem;
			color: var(--mc-text-muted);
			line-height: 1.6;
		}

		.templates {
			display: grid;
			gap: 0.4rem;
			padding: 0;
			margin: 0;
			list-style: none;

			li {
				display: grid;
				grid-template-columns: minmax(12rem, auto) 6rem 1fr;
				gap: 0.75rem;
				align-items: baseline;
				padding: 0.4rem 0;
				border-bottom: 1px solid var(--mc-border);
			}
		}

		.template-key {
			font-family: var(--mc-font-mono, monospace);
			font-size: 0.85rem;
		}

		.template-difficulty {
			font-size: 0.75rem;
			letter-spacing: 0.08em;
			text-transform: uppercase;
			color: var(--mc-text-subtle);
		}

		/* The frame with sample values: what the collector would read. */
		.template-frame {
			font-size: 0.85rem;
			color: var(--mc-text-muted);
		}

		.mc-form-actions {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 1rem;
		}

		/* A napok listája: dátum, sablon, nehézség, majd maga a mondat. */
		.history {
			display: grid;
			gap: 0.4rem;
			padding: 0;
			margin: 0;
			list-style: none;

			li {
				display: grid;
				grid-template-columns: 6.5rem minmax(10rem, auto) 6rem 1fr;
				gap: 0.75rem;
				align-items: baseline;
				padding: 0.4rem 0;
				border-bottom: 1px solid var(--mc-border);
			}
		}

		.history-day {
			font-variant-numeric: tabular-nums;
			font-size: 0.85rem;
			color: var(--mc-text-subtle);
		}

		.history-question {
			font-size: 0.85rem;
			color: var(--mc-text-muted);
		}

		.saved {
			color: var(--mc-status-ok);
			font-size: 0.85rem;
		}

		.outcome {
			margin: 0.75rem 0 0;
			font-size: 0.85rem;
			color: var(--mc-text-muted);
		}

		@media (width <= 720px) {
			.templates li,
			.history li {
				grid-template-columns: 1fr;
				gap: 0.2rem;
			}
		}
	`,
})
export class DailyQuestionSettingsComponent {
	protected readonly store = inject(DailyQuestionSettingsStore);
	protected readonly templatePrefix = 'dailyQuestion.template.';
	protected readonly difficultyPrefix = 'page.daily-question.difficulty.';
	/**
	 * Stand-ins for the frame's slots, so the admin reads a sentence instead
	 * of a skeleton. The real values come from the catalog when the question
	 * is composed.
	 */
	protected readonly sampleParams = {
		album: '…',
		artist: '…',
		track: '…',
		musician: '…',
		role: '…',
		label: '…',
		country: '…',
		year: '…',
		edition: '…',
	};

	protected value(event: Event): string {
		return (event.target as HTMLInputElement).value;
	}

	protected checked(event: Event): boolean {
		return (event.target as HTMLInputElement).checked;
	}
}
