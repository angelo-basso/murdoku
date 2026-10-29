import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter } from '@angular/router';
import {
  IonicRouteStrategy,
  provideIonicAngular,
} from '@ionic/angular/standalone';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    // Pas de « glisser depuis le bord pour revenir » : il volait le glisser-déposer des personnages.
    provideIonicAngular({ mode: 'ios', swipeBackEnabled: false }),
    provideRouter(routes),
  ],
}).catch((err) => console.error(err));
