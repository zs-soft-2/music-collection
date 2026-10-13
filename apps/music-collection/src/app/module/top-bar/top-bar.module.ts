import { NgModule } from '@angular/core';

import { TopBarComponent } from './component';

/**
 * A sávot a shell innen kapja meg. A komponens standalone: a sablonjához
 * szükséges mindent (`PlayerMiniComponent`, `LanguagePickerComponent`, a
 * router-direktívák) maga importálja, ezért ez a modul csak átengedi.
 *
 * Nem kerül ide semmi más: amit a modul importál, azt a webpack az első
 * bundle-be húzza — a standalone komponens sablonja viszont nem látja. Így
 * szivárgott ide korábban a `primeng/select`, a `primeng/menubar` és a
 * `UserProfileModule` (az `mc-user-profile` sehol nincs kirakva), vagyis
 * ~250 kB olyan kód, amit egyetlen lap sem rajzolt ki.
 */
@NgModule({
	imports: [TopBarComponent],
	exports: [TopBarComponent],
})
export class TopBarModule {}
