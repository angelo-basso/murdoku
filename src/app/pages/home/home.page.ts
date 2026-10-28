import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmark, lockClosed, play, timeOutline } from 'ionicons/icons';
import { THEME_LIST } from '../../core/data/deduction-themes';
import { DIFFICULTIES, shareCode } from '../../core/engine/generator';
import { Difficulty } from '../../core/models/deduction.models';
import { LEVELS_PER_DIFFICULTY, ProgressService, formatTime } from '../../core/services/progress.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  template: `
    <ion-content [fullscreen]="true" class="ion-padding home">
      <img class="logo" src="assets/brand/logo.svg" alt="Murdoku — Sudoku d'enquête" />
      <p class="tagline">Placez les suspects d'après les indices et démasquez le coupable.</p>

      @if (progress.lastSave(); as last) {
        <button type="button" class="resume" (click)="router.navigate(last.route)">
          <ion-icon name="play"></ion-icon>
          <span class="rtxt"><b>Reprendre l'enquête</b><small>{{ last.title }} · {{ fmt(last.elapsedMs) }}</small></span>
        </button>
      }

      <!-- Difficultés -->
      <nav class="tabs" role="tablist" aria-label="Difficulté">
        @for (d of difficulties; track d.id) {
          <button type="button" role="tab" class="tab" [class.on]="diff() === d.id" [attr.aria-selected]="diff() === d.id" (click)="diff.set(d.id)">
            <b>{{ d.label }}</b>
            <small>{{ d.size }}×{{ d.size }} · {{ countFor(d.id) }}/{{ perDiff }}</small>
          </button>
        }
      </nav>

      <!-- Niveaux -->
      <section class="card">
        <div class="card-head">
          <h2>Affaires · {{ diffDef().label }}</h2>
          <span class="count">{{ doneHere() }}/{{ perDiff }}</span>
        </div>
        <div class="bar"><span [style.width.%]="doneHere() / perDiff * 100"></span></div>
        <div class="levels">
          @for (lv of levels(); track lv.id) {
            <button type="button" class="lv" [class.done]="lv.done" [class.wip]="lv.wip" (click)="openLevel(lv.id)"
              [attr.aria-label]="'Affaire ' + lv.index + (lv.done ? ', réussie en ' + lv.best : '')">
              <span class="num">{{ lv.index }}</span>
              <span class="emo" aria-hidden="true">{{ lv.emoji }}</span>
              @if (lv.done) { <span class="best">{{ lv.best }}</span> }
              @else if (lv.wip) { <span class="best">en cours</span> }
            </button>
          }
        </div>
      </section>

      <!-- Générateur -->
      <section class="card gen" [class.locked]="!unlocked()">
        <div class="card-head">
          <h2>Générateur · {{ diffDef().label }}</h2>
          @if (!unlocked()) { <ion-icon name="lock-closed" aria-label="Verrouillé"></ion-icon> }
        </div>
        @if (unlocked()) {
          <p class="muted">Des affaires inédites à l'infini, partageables par code.</p>
          <div class="chips">
            @for (t of themes; track t.id) {
              <button type="button" class="chip" [class.on]="theme() === t.id" [attr.aria-pressed]="theme() === t.id" (click)="theme.set(t.id)">
                {{ t.emoji }} {{ t.name }}
              </button>
            }
          </div>
          <button type="button" class="primary" (click)="newGame()">Générer une affaire</button>
        } @else {
          <p class="muted">Termine les {{ perDiff }} affaires « {{ diffDef().label }} » pour débloquer le générateur de cette difficulté
            (encore {{ perDiff - doneHere() }}).</p>
        }
      </section>

      <!-- Règles -->
      <section class="card rules">
        <h2>Comment jouer</h2>
        <ol>
          <li><span class="n">1</span><p>Une seule personne par <b>ligne</b> et par <b>colonne</b>.</p></li>
          <li><span class="n">2</span><p>On se place sur un siège, un lit ou le sol — jamais sur un meuble <b>hachuré</b>.</p></li>
          <li><span class="n">3</span><p>Tous les <b>indices</b> doivent être respectés.</p></li>
          <li><span class="n">4</span><p>Le <b>coupable</b> est celui qui se retrouve seul avec la victime dans sa pièce.</p></li>
        </ol>
        <button type="button" class="secondary" (click)="router.navigate(['/deduction', 'manoir-6'])">Faire l'affaire d'initiation</button>
      </section>

      <!-- Code partagé -->
      <section class="shared">
        <p class="label">Un ami vous a envoyé une affaire ?</p>
        <div class="codebox">
          <input #code placeholder="Coller le code (ex. hante.6.m.ab12cd)" autocapitalize="off" autocomplete="off" spellcheck="false"
            (keyup.enter)="playCode(code.value)" />
          <button type="button" (click)="playCode(code.value)">Jouer</button>
        </div>
      </section>
    </ion-content>
  `,
  styles: [`
    .home::part(scroll) { padding-top: calc(env(safe-area-inset-top, 0px) + 12px); }
    .logo { display: block; width: 100%; max-width: 280px; margin: 6px auto 4px; }
    .tagline { color: #c9c1e2; font-size: .92rem; line-height: 1.4; margin: 2px auto 16px; text-align: center; max-width: 320px; }
    section, .resume, .tabs { max-width: 460px; margin-left: auto; margin-right: auto; }
    .resume { display: flex; align-items: center; gap: 12px; width: 100%; margin-bottom: 14px; padding: 12px 14px;
      border-radius: 14px; border: 1px solid var(--ion-color-primary); background: #d4af3718; color: var(--ion-text-color); text-align: left; }
    .resume ion-icon { font-size: 1.4rem; color: var(--ion-color-primary); flex: none; }
    .rtxt { display: flex; flex-direction: column; min-width: 0; }
    .rtxt small { color: #b9b0d6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tabs { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; margin-bottom: 12px; scrollbar-width: none; }
    .tabs::-webkit-scrollbar { display: none; }
    .tab { flex: 1 0 auto; min-width: 84px; min-height: 52px; display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 1px; padding: 6px 10px; border-radius: 12px; border: 1px solid #ffffff1c; background: #ffffff08; color: var(--ion-text-color); font-size: .82rem; }
    .tab small { font-size: .68rem; opacity: .7; }
    .tab.on { background: var(--ion-color-primary); color: var(--ion-color-primary-contrast); border-color: var(--ion-color-primary); }
    .tab.on small { opacity: .85; }
    .card { margin-bottom: 14px; padding: 14px; border-radius: 16px; background: var(--ion-card-background); border: 1px solid #ffffff12; }
    .card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    h2 { margin: 0; font: 600 1.05rem Georgia, serif; color: var(--ion-color-primary); }
    .count { font-size: .8rem; color: #b9b0d6; font-variant-numeric: tabular-nums; }
    .bar { height: 5px; border-radius: 3px; background: #ffffff12; margin: 10px 0 12px; overflow: hidden; }
    .bar span { display: block; height: 100%; background: var(--ion-color-primary); }
    .levels { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 7px; }
    .lv { position: relative; aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px;
      border-radius: 11px; border: 1px solid #ffffff18; background: #ffffff07; color: var(--ion-text-color); padding: 2px; }
    .lv:active { transform: scale(.95); }
    .lv .num { font: 700 1.05rem Georgia, serif; line-height: 1; }
    .lv .emo { font-size: .8rem; line-height: 1; opacity: .85; }
    .lv .best { font-size: .58rem; color: #2dd36f; font-variant-numeric: tabular-nums; }
    .lv.done { border-color: #2dd36f66; background: #2dd36f12; }
    .lv.wip { border-color: var(--ion-color-primary); }
    .lv.wip .best { color: var(--ion-color-primary); }
    .gen ion-icon { color: #8f87ad; font-size: 1.1rem; }
    .gen.locked { opacity: .85; border-style: dashed; }
    .muted { color: #b9b0d6; font-size: .86rem; line-height: 1.4; margin: 8px 0 10px; }
    .chips { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
    .chip { min-height: 44px; border-radius: 11px; border: 1px solid #ffffff1c; background: #ffffff08; color: var(--ion-text-color); font-size: .82rem; }
    .chip.on { background: var(--ion-color-primary); color: var(--ion-color-primary-contrast); border-color: var(--ion-color-primary); font-weight: 700; }
    .primary { width: 100%; margin-top: 12px; min-height: 50px; border-radius: 12px; border: none; background: var(--ion-color-primary);
      color: var(--ion-color-primary-contrast); font: 700 1.02rem Georgia, serif; }
    .secondary { width: 100%; margin-top: 4px; min-height: 46px; border-radius: 12px; background: transparent;
      border: 1px solid rgba(212,175,55,.45); color: var(--ion-color-primary); font-size: .9rem; font-weight: 600; }
    .rules h2 { margin-bottom: 10px; }
    .rules ol { list-style: none; margin: 0 0 6px; padding: 0; }
    .rules li { display: flex; gap: 10px; align-items: flex-start; margin: 0 0 9px; font-size: .88rem; line-height: 1.4; color: #e3dcf5; }
    .rules li p { margin: 0; }
    .rules .n { flex: 0 0 22px; height: 22px; border-radius: 50%; display: grid; place-items: center;
      background: #d4af3722; color: var(--ion-color-primary); font-size: .75rem; font-weight: 700; }
    .rules b { color: #fff; }
    .label { margin: 4px 0 6px; font-size: .72rem; letter-spacing: .08em; text-transform: uppercase; color: #8f87ad; }
    .codebox { display: flex; gap: 8px; padding-bottom: 24px; }
    .codebox input { flex: 1; min-width: 0; min-height: 46px; background: #0003; border: 1px solid #ffffff22; border-radius: 11px;
      color: var(--ion-text-color); padding: 0 12px; font-size: .85rem; }
    .codebox input:focus { outline: none; border-color: var(--ion-color-primary); }
    .codebox button { min-height: 46px; border: 1px solid rgba(212,175,55,.45); background: transparent; color: var(--ion-color-primary);
      border-radius: 11px; padding: 0 16px; font-size: .9rem; font-weight: 600; }
  `],
})
export class HomePage implements OnInit {
  readonly router = inject(Router);
  readonly progress = inject(ProgressService);

  readonly difficulties = DIFFICULTIES;
  readonly themes = THEME_LIST;
  readonly perDiff = LEVELS_PER_DIFFICULTY;
  readonly diff = signal<Difficulty>('facile');
  readonly theme = signal('hante');

  readonly diffDef = computed(() => DIFFICULTIES.find((d) => d.id === this.diff())!);
  readonly doneHere = computed(() => this.countFor(this.diff()));
  readonly unlocked = computed(() => this.doneHere() >= LEVELS_PER_DIFFICULTY);

  /** Tuiles des niveaux (le décor suit la même rotation que tools/build-levels.ts). */
  readonly levels = computed(() => {
    const done = this.progress.done();
    const last = this.progress.lastSave();
    return Array.from({ length: LEVELS_PER_DIFFICULTY }, (_, i) => {
      const id = `${this.diff()}-${String(i + 1).padStart(2, '0')}`;
      const best = done[id]?.bestMs;
      return {
        id, index: i + 1, emoji: THEME_LIST[i % THEME_LIST.length].emoji,
        done: best !== undefined, best: best !== undefined ? formatTime(best) : '',
        wip: best === undefined && (last?.key === id || !!this.progress.getSave(id)),
      };
    });
  });

  constructor() {
    addIcons({ checkmark, lockClosed, play, timeOutline });
  }

  async ngOnInit(): Promise<void> {
    await this.progress.load();
    // Ouvre sur la première difficulté pas encore terminée.
    const first = DIFFICULTIES.find((d) => !this.progress.generatorUnlocked(d.id));
    if (first) this.diff.set(first.id);
  }

  /** Réussites d'une difficulté (lit le signal pour rester réactif). */
  countFor(d: Difficulty): number {
    return Object.keys(this.progress.done()).filter((id) => id.startsWith(d + '-')).length;
  }

  fmt(ms: number): string { return formatTime(ms); }

  openLevel(id: string): void { this.router.navigate(['/niveau', id]); }

  newGame(): void {
    if (!this.unlocked()) return;
    const seed = Math.random().toString(36).slice(2, 8);
    const code = shareCode({ themeId: this.theme(), size: this.diffDef().size, difficulty: this.diff(), seed });
    this.router.navigate(['/deduction/gen', code]);
  }

  playCode(code: string): void {
    const trimmed = (code || '').trim();
    if (trimmed) this.router.navigate(['/deduction/gen', trimmed]);
  }
}
