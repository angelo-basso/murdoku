import { Component, OnInit, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonIcon, ViewDidEnter } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { bookOutline, cartOutline, chevronForward, diceOutline, lockClosed, play, searchOutline, settingsOutline } from 'ionicons/icons';
import { DIFFICULTIES } from '../../core/engine/generator';
import { AudioService } from '../../core/services/audio.service';
import { LEVELS_PER_DIFFICULTY, ProgressService, formatTime } from '../../core/services/progress.service';

/** Menu principal. */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [IonContent, IonIcon],
  template: `
    <ion-content [fullscreen]="true" class="ion-padding mk-page home">
      <div class="mk-wrap">
        <h1 class="sr-only">Murdoku, Sudoku d'enquête</h1>
        <img class="logo" src="assets/brand/logo.svg" alt="" />
        <p class="tagline">Placez les suspects d'après les indices et démasquez le coupable.</p>
        <p class="wallet" [attr.aria-label]="progress.energy() + ' énergies, ' + progress.balance() + ' étoiles, ' + progress.inventory().hints + ' indices, ' + progress.inventory().loupes + ' loupes'">
          <span>⚡ {{ progress.energy() }}@if (progress.energyNextMs()) {<small class="tick"> {{ fmt(progress.energyNextMs()) }}</small>}</span>
          <span>★ {{ progress.balance() }}</span><span>💡 {{ progress.inventory().hints }}</span><span>🔍 {{ progress.inventory().loupes }}</span>
        </p>

        @if (progress.lastSave(); as last) {
          <button type="button" class="resume" (click)="router.navigate(last.route)">
            <ion-icon name="play" aria-hidden="true"></ion-icon>
            <span class="txt"><b>Reprendre l'enquête</b><small>{{ last.title }} · {{ fmt(last.elapsedMs) }}</small></span>
          </button>
        }

        <nav class="menu" aria-label="Menu principal">
          <button type="button" class="entry" (click)="router.navigate(['/classique'])">
            <ion-icon name="search-outline" aria-hidden="true"></ion-icon>
            <span class="txt"><b>Affaires classiques</b><small>{{ totalDone() }}/{{ total }} résolues · {{ progress.earned() }} ★ gagnées</small></span>
            <ion-icon class="go" name="chevron-forward" aria-hidden="true"></ion-icon>
          </button>

          <button type="button" class="entry" [class.locked]="!customUnlocked()" [attr.aria-disabled]="!customUnlocked()"
            (click)="openCustom()">
            <ion-icon [name]="customUnlocked() ? 'dice-outline' : 'lock-closed'" aria-hidden="true"></ion-icon>
            <span class="txt">
              <b>Affaires sur mesure{{ customUnlocked() ? '' : ' (verrouillé)' }}</b>
              <small>{{ customUnlocked() ? 'Générateur infini et codes partagés' : 'Termine les ' + perDiff + ' affaires d\\'une difficulté pour débloquer' }}</small>
            </span>
            @if (customUnlocked()) { <ion-icon class="go" name="chevron-forward" aria-hidden="true"></ion-icon> }
          </button>

          <button type="button" class="entry" (click)="router.navigate(['/boutique'])">
            <ion-icon name="cart-outline" aria-hidden="true"></ion-icon>
            <span class="txt"><b>Boutique</b><small>Échange tes étoiles : énergie, indices, loupes, cadres</small></span>
            <ion-icon class="go" name="chevron-forward" aria-hidden="true"></ion-icon>
          </button>

          <button type="button" class="entry" (click)="router.navigate(['/regles'])">
            <ion-icon name="book-outline" aria-hidden="true"></ion-icon>
            <span class="txt"><b>Comment jouer</b><small>Règles et affaire d'initiation</small></span>
            <ion-icon class="go" name="chevron-forward" aria-hidden="true"></ion-icon>
          </button>

          <button type="button" class="entry" (click)="router.navigate(['/reglages'])">
            <ion-icon name="settings-outline" aria-hidden="true"></ion-icon>
            <span class="txt"><b>Réglages</b><small>Sons, musique, vibrations, accessibilité</small></span>
            <ion-icon class="go" name="chevron-forward" aria-hidden="true"></ion-icon>
          </button>
        </nav>
        @if (lockedMsg) { <p class="locked-msg" role="alert">{{ lockedMsg }}</p> }
      </div>
    </ion-content>
  `,
  styles: [`
    .home::part(scroll) { padding-top: calc(env(safe-area-inset-top, 0px) + 12px); }
    .logo { display: block; width: 100%; max-width: 280px; margin: 6px auto 4px; }
    .tagline { color: var(--mk-muted); font-size: .92rem; line-height: 1.4; margin: 2px auto 18px; text-align: center; max-width: 320px; }
    .resume, .entry { display: flex; align-items: center; gap: 14px; width: 100%; padding: 14px 16px; border-radius: 16px;
      text-align: left; color: var(--ion-text-color); }
    .resume { margin-bottom: 14px; border: 1px solid var(--ion-color-primary); background: #d4af3718; }
    .resume ion-icon, .entry ion-icon { font-size: 1.5rem; color: var(--ion-color-primary); flex: none; }
    .txt { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
    .txt b { font: 600 1.05rem Georgia, serif; }
    .txt small { color: var(--mk-muted); font-size: .8rem; line-height: 1.3; }
    .wallet { display: flex; justify-content: center; gap: 16px; margin: -8px 0 16px; color: var(--mk-gold-text); font-weight: 700; font-size: .95rem; }
    .wallet .tick { font-size: .7rem; color: var(--mk-muted); font-weight: 500; }
    .menu { display: flex; flex-direction: column; gap: 10px; }
    .entry { min-height: 72px; background: var(--ion-card-background); border: 1px solid var(--mk-border); }
    .entry:active { transform: scale(.98); }
    .entry .go { font-size: 1.1rem; color: var(--mk-dim); }
    .entry.locked { border-style: dashed; opacity: .8; }
    .entry.locked ion-icon { color: var(--mk-dim); }
    .locked-msg { margin: 12px 4px; color: var(--mk-gold-text); font-size: .86rem; text-align: center; }
  `],
})
export class HomePage implements OnInit, ViewDidEnter {
  readonly router = inject(Router);
  readonly progress = inject(ProgressService);
  private audio = inject(AudioService);
  readonly perDiff = LEVELS_PER_DIFFICULTY;
  readonly total = LEVELS_PER_DIFFICULTY * DIFFICULTIES.length;
  lockedMsg = '';

  readonly totalDone = computed(() => Object.keys(this.progress.done()).filter((id) => /-\d+$/.test(id)).length);
  readonly customUnlocked = computed(() => {
    const done = Object.keys(this.progress.done());
    return DIFFICULTIES.some((d) => done.filter((id) => id.startsWith(d.id + '-')).length >= LEVELS_PER_DIFFICULTY);
  });

  constructor() {
    addIcons({ bookOutline, cartOutline, chevronForward, diceOutline, lockClosed, play, searchOutline, settingsOutline });
  }

  async ngOnInit(): Promise<void> { await this.progress.load(); }
  ionViewDidEnter(): void { this.audio.playMusic('menu'); }

  openCustom(): void {
    if (this.customUnlocked()) { this.router.navigate(['/sur-mesure']); return; }
    this.lockedMsg = `Mode verrouillé : termine les ${this.perDiff} affaires classiques d'une difficulté pour l'ouvrir.`;
  }

  fmt(ms: number): string { return formatTime(ms); }
}
