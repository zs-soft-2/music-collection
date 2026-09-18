import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { ErrorToastComponent } from './component/error-toast';

@NgModule({
	exports: [ErrorToastComponent],
	imports: [CommonModule, ErrorToastComponent],
})
export class CoreErrorViewModule {}
