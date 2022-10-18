import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { TopBarModule } from './module';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, TopBarModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
