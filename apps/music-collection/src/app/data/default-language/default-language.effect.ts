import { Observable } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { LanguageEnum } from '@music-collection/core/i18n';

import { DefaultLanguageRepository } from './default-language.repository';

/** Reads and writes the language the app opens in for a reader with no pick. */
@Injectable({ providedIn: 'root' })
export class DefaultLanguageEffect {
	private readonly repository = inject(DefaultLanguageRepository);

	public value$(): Observable<LanguageEnum | null> {
		return this.repository.value$();
	}

	public save(language: LanguageEnum): Promise<void> {
		return this.repository.save(language);
	}
}
