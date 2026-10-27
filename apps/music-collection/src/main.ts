import { enableProdMode } from '@angular/core';

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import {
	installDiagnostics,
	probeDiagnostics,
} from './app/shared/diagnostics/diagnostics';
import { environment } from './environments/environment';

if (environment.production) {
	enableProdMode();
}

// `?debug` opens a log on the page, for a phone with no inspector to hand.
installDiagnostics();

bootstrapApplication(AppComponent, appConfig)
	.then((application) => probeDiagnostics(application.injector))
	.catch((err) => console.error(err));
