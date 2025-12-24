import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { SimplePuzzleComponent } from './simple-puzzle/simple-puzzle.component';
import { LeaderboardTopTenPipe } from './simple-puzzle/leaderboard-top-ten.pipe';

@NgModule({
  declarations: [
    AppComponent,
    SimplePuzzleComponent,
    LeaderboardTopTenPipe
  ],
  imports: [
    BrowserModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
