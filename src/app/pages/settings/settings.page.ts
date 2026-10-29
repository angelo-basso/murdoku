import { Component, computed, inject, signal } from '@angular/core';
import { App } from '@capacitor/app';
import {
  IonBackButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonListHeader, IonNote, IonRange, IonSegment, IonSegmentButton, IonTitle, IonToggle, IonToolbar,
} from '@ionic/angular/standalone';
import { AudioService } from '../../core/services/audio.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { Settings, SettingsService } from '../../core/services/settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonList, IonListHeader, IonItem, IonLabel, IonToggle, IonRange, IonNote, IonSegment, IonSegmentButton],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/home" text="" aria-label="Retour au menu"></ion-back-button></ion-buttons>
        <ion-title>Réglages</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="mk-page">
      <div class="mk-wrap">
        <ion-list inset>
          <ion-list-header><ion-label id="theme-lbl">Apparence</ion-label></ion-list-header>
          <ion-item>
            <ion-segment [value]="s().theme" (ionChange)="set('theme', $any($event.detail.value))" aria-labelledby="theme-lbl">
              <ion-segment-button value="system"><ion-label>Auto</ion-label></ion-segment-button>
              <ion-segment-button value="light"><ion-label>Clair</ion-label></ion-segment-button>
              <ion-segment-button value="dark"><ion-label>Sombre</ion-label></ion-segment-button>
            </ion-segment>
          </ion-item>
          <ion-note class="note">Auto suit le thème du téléphone (sombre s'il n'en indique aucun). Actuellement : {{ current() }}.</ion-note>
        </ion-list>

        <ion-list inset>
          <ion-list-header><ion-label>Sons</ion-label></ion-list-header>
          <ion-item>
            <ion-toggle [checked]="s().music" (ionChange)="set('music', $event.detail.checked)">Musique d'ambiance</ion-toggle>
          </ion-item>
          <ion-item [disabled]="!s().music">
            <ion-range aria-label="Volume de la musique" [min]="0" [max]="100" [step]="5" [value]="s().musicVolume"
              (ionInput)="set('musicVolume', +$event.detail.value)" labelPlacement="start" label="Volume musique"></ion-range>
          </ion-item>
          <ion-item>
            <ion-toggle [checked]="s().sfx" (ionChange)="set('sfx', $event.detail.checked); test('place')">Effets sonores</ion-toggle>
          </ion-item>
          <ion-item [disabled]="!s().sfx">
            <ion-range aria-label="Volume des effets" [min]="0" [max]="100" [step]="5" [value]="s().sfxVolume"
              (ionChange)="set('sfxVolume', +$event.detail.value); test('place')" labelPlacement="start" label="Volume effets"></ion-range>
          </ion-item>
          <ion-note class="note">Une musique par décor : clavecin au manoir, thérémine au manoir hanté, piano électrique aux bureaux, rythmes mécaniques à l'usine.</ion-note>
        </ion-list>

        <ion-list inset>
          <ion-list-header><ion-label>Vibrations</ion-label></ion-list-header>
          <ion-item>
            <ion-toggle [checked]="s().haptics" (ionChange)="set('haptics', $event.detail.checked); test('place')">Vibrer à chaque pose</ion-toggle>
          </ion-item>
          <ion-item [disabled]="!s().haptics">
            <ion-toggle [checked]="s().hapticError" (ionChange)="set('hapticError', $event.detail.checked); test('error')">Vibrer en cas d'erreur</ion-toggle>
          </ion-item>
          <ion-note class="note">Une erreur : deux personnes sur une même ligne, colonne ou pièce, ou un indice contredit.</ion-note>
        </ion-list>

        <ion-list inset>
          <ion-list-header><ion-label>Accessibilité</ion-label></ion-list-header>
          <ion-item>
            <ion-toggle [checked]="s().announce" (ionChange)="set('announce', $event.detail.checked)">Annonces vocales</ion-toggle>
          </ion-item>
          <ion-item>
            <ion-toggle [checked]="s().reduceMotion" (ionChange)="set('reduceMotion', $event.detail.checked)">Réduire les animations</ion-toggle>
          </ion-item>
          <ion-note class="note">Annonces vocales : chaque coup, erreur et victoire est lu par le lecteur d'écran. Le jeu se joue entièrement avec TalkBack (Android) ou VoiceOver (iOS) : chaque case annonce sa ligne, sa colonne, sa pièce,
            son meuble et son occupant ; chaque coup est décrit à voix haute. Le plan des pièces est lisible après le plateau.</ion-note>
        </ion-list>
        <p class="version">Meurtre au carré {{ version() }}</p>
      </div>
    </ion-content>
  `,
  styles: [`
    ion-list { background: transparent; }
    ion-list-header ion-label { font: 600 1rem Georgia, serif; color: var(--ion-color-primary); }
    .version { text-align: center; color: var(--mk-dim); font-size: .78rem; margin: 8px 0 24px; }
    .note { display: block; padding: 8px 16px 12px; font-size: .8rem; line-height: 1.4; }
  `],
})
export class SettingsPage {
  private settings = inject(SettingsService);
  private feedback = inject(FeedbackService);
  private audio = inject(AudioService);
  readonly s = this.settings.settings;
  readonly version = signal('');
  constructor() { void App.getInfo().then((i) => this.version.set(`v${i.version}`)).catch(() => this.version.set('web')); }
  readonly current = computed(() => (this.settings.resolvedTheme(this.s().theme) === 'light' ? 'clair' : 'sombre'));

  ionViewDidEnter(): void { this.audio.playMusic('menu'); }

  set<K extends keyof Settings>(k: K, v: Settings[K]): void { this.settings.set(k, v); }
  test(kind: 'place' | 'error'): void { this.feedback.emit(kind); }
}
