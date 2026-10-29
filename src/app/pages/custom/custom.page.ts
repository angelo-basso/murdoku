import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, ViewDidEnter } from '@ionic/angular/standalone';
import { THEME_LIST } from '../../core/data/deduction-themes';
import { DIFFICULTIES, parseCode, shareCode } from '../../core/engine/generator';
import { Difficulty } from '../../core/models/deduction.models';
import { AudioService } from '../../core/services/audio.service';
import { LEVELS_PER_DIFFICULTY, ProgressService } from '../../core/services/progress.service';

/** Affaires générées à l'infini et codes partagés (débloqué par une difficulté terminée). */
@Component({
  selector: 'app-custom',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/home" text="" aria-label="Retour au menu"></ion-back-button></ion-buttons>
        <ion-title>Affaires sur mesure</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding mk-page">
      <div class="mk-wrap">
        <section class="mk-card" aria-labelledby="gen-title">
          <h2 id="gen-title">Générer une affaire</h2>
          <p class="mk-muted">Des affaires inédites à l'infini, chacune avec une solution unique et partageable par code.</p>

          <h3 class="lbl" id="diff-lbl">Difficulté</h3>
          <div class="mk-chips" role="group" aria-labelledby="diff-lbl">
            @for (d of difficulties; track d.id) {
              <button type="button" class="mk-chip" [disabled]="!unlocked(d.id)" [attr.aria-pressed]="diff() === d.id" (click)="diff.set(d.id)"
                [attr.aria-label]="d.label + ', ' + d.size + ' par ' + d.size + (unlocked(d.id) ? '' : ', verrouillé : termine ses ' + perDiff + ' affaires classiques')">
                {{ unlocked(d.id) ? '' : '🔒 ' }}{{ d.label }}<small>{{ d.size }}×{{ d.size }}</small>
              </button>
            }
          </div>

          <h3 class="lbl" id="theme-lbl">Décor</h3>
          <div class="mk-chips" role="group" aria-labelledby="theme-lbl">
            @for (t of themes; track t.id) {
              <button type="button" class="mk-chip" [attr.aria-pressed]="theme() === t.id" (click)="theme.set(t.id)">
                <span aria-hidden="true">{{ t.emoji }} </span>{{ t.name }}
              </button>
            }
          </div>
          <button type="button" class="mk-primary" [disabled]="!unlocked(diff())" (click)="newGame()">Générer une affaire</button>
        </section>

        <section class="mk-card" aria-labelledby="code-title">
          <h2 id="code-title">Code partagé</h2>
          <p class="mk-muted">Un ami vous a envoyé une affaire ? Collez son code.</p>
          <div class="codebox">
            <label class="sr-only" for="code">Code de l'affaire</label>
            <input id="code" #code placeholder="ex. hante.6.m.ab12cd" autocapitalize="off" autocomplete="off" spellcheck="false"
              (keyup.enter)="playCode(code.value)" />
            <button type="button" (click)="playCode(code.value)">Jouer</button>
          </div>
          @if (codeError()) { <p class="err" role="alert">{{ codeError() }}</p> }
        </section>
      </div>
    </ion-content>
  `,
  styles: [`
    .lbl { margin: 14px 0 6px; font-size: .72rem; letter-spacing: .08em; text-transform: uppercase; color: var(--mk-dim); font-weight: 600; }
    .codebox { display: flex; gap: 8px; }
    .codebox input { flex: 1; min-width: 0; min-height: 46px; background: #0003; border: 1px solid var(--mk-border); border-radius: 11px;
      color: var(--ion-text-color); padding: 0 12px; font-size: .9rem; }
    .codebox input:focus { outline: none; border-color: var(--ion-color-primary); }
    .codebox button { min-height: 46px; border: 1px solid rgba(212,175,55,.45); background: transparent; color: var(--ion-color-primary);
      border-radius: 11px; padding: 0 16px; font-size: .9rem; font-weight: 600; }
    .err { color: var(--mk-danger-text); font-size: .85rem; margin: 8px 0 0; }
  `],
})
export class CustomPage implements OnInit, ViewDidEnter {
  private router = inject(Router);
  private progress = inject(ProgressService);
  private audio = inject(AudioService);

  readonly difficulties = DIFFICULTIES;
  readonly themes = THEME_LIST;
  readonly perDiff = LEVELS_PER_DIFFICULTY;
  readonly diff = signal<Difficulty>('facile');
  readonly theme = signal('hante');
  readonly codeError = signal('');

  readonly unlockedSet = computed(() => {
    const done = Object.keys(this.progress.done());
    return new Set(DIFFICULTIES.filter((d) => done.filter((id) => id.startsWith(d.id + '-')).length >= LEVELS_PER_DIFFICULTY).map((d) => d.id));
  });
  unlocked(d: Difficulty): boolean { return this.unlockedSet().has(d); }

  async ngOnInit(): Promise<void> {
    await this.progress.load();
    const first = DIFFICULTIES.find((d) => this.unlocked(d.id));
    if (first) this.diff.set(first.id);
  }
  ionViewDidEnter(): void { this.audio.playMusic('menu'); }

  newGame(): void {
    if (!this.unlocked(this.diff())) return;
    const seed = Math.random().toString(36).slice(2, 8);
    const size = DIFFICULTIES.find((d) => d.id === this.diff())!.size;
    this.router.navigate(['/deduction/gen', shareCode({ themeId: this.theme(), size, difficulty: this.diff(), seed })]);
  }

  playCode(code: string): void {
    const trimmed = (code || '').trim();
    if (!trimmed) return;
    if (!parseCode(trimmed)) { this.codeError.set('Code invalide. Il ressemble à « hante.6.m.ab12cd ».'); return; }
    this.codeError.set('');
    this.router.navigate(['/deduction/gen', trimmed]);
  }
}
