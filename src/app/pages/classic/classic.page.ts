import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, ViewDidEnter } from '@ionic/angular/standalone';
import { THEME_LIST } from '../../core/data/deduction-themes';
import { DIFFICULTIES } from '../../core/engine/generator';
import { Difficulty } from '../../core/models/deduction.models';
import { AudioService } from '../../core/services/audio.service';
import { DIFF_ORDER, LEVELS_PER_DIFFICULTY, LEVELS_TO_UNLOCK_NEXT, ProgressService, STAR_TIMES, formatTime } from '../../core/services/progress.service';

/** Les 100 affaires prédéfinies, par difficulté. */
@Component({
  selector: 'app-classic',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/home" text="" aria-label="Retour au menu"></ion-back-button></ion-buttons>
        <ion-title>Affaires classiques</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding mk-page">
      <div class="mk-wrap">
        <div class="tabs" role="tablist" aria-label="Difficulté">
          @for (d of difficulties; track d.id) {
            <button type="button" role="tab" class="tab" [class.on]="diff() === d.id" [class.locked]="!diffOpen(d.id)" [attr.aria-selected]="diff() === d.id"
              [attr.aria-label]="d.label + ', grille ' + d.size + ' par ' + d.size + ', ' + countFor(d.id) + ' sur ' + perDiff + ' résolues' + (diffOpen(d.id) ? '' : ', verrouillée')"
              (click)="diff.set(d.id); lockedTap.set('')">
              <b>{{ diffOpen(d.id) ? '' : '🔒 ' }}{{ d.label }}</b>
              <small>{{ d.size }}×{{ d.size }} · {{ countFor(d.id) }}/{{ perDiff }}</small>
            </button>
          }
        </div>

        <section class="mk-card" role="tabpanel" [attr.aria-label]="'Affaires ' + diffDef().label">
          <div class="mk-head">
            <h2>Affaires · {{ diffDef().label }}</h2>
            <span class="count">{{ doneHere() }}/{{ perDiff }}</span>
          </div>
          <div class="bar" aria-hidden="true"><span [style.width.%]="doneHere() / perDiff * 100"></span></div>
          <p class="mk-muted scale">Étoiles : ★★★ en moins de {{ scale().three }} min, ★★ en moins de {{ scale().two }} min. {{ starsHere() }}/{{ perDiff * 3 }} ★ obtenues ici.</p>
          @if (!diffOpen(diff())) {
            <p class="lockmsg" role="status">🔒 Résous {{ toUnlock }} affaires « {{ prevLabel() }} » pour ouvrir cette difficulté (encore {{ missing() }}).</p>
          }
          @if (lockedTap()) { <p class="lockmsg" role="alert">{{ lockedTap() }}</p> }
          <div class="levels">
            @for (lv of levels(); track lv.id) {
              <button type="button" class="lv" [class.done]="lv.done" [class.wip]="lv.wip" [class.locked]="lv.locked" (click)="open(lv)"
                [attr.aria-disabled]="lv.locked"
                [attr.aria-label]="'Affaire ' + lv.index + ', ' + lv.themeName + (lv.locked ? ', verrouillée' : lv.done ? ', résolue en ' + lv.best + ', ' + lv.stars + ' étoile' + (lv.stars > 1 ? 's' : '') : lv.wip ? ', en cours' : ', à résoudre')">
                <span class="num">{{ lv.locked ? '🔒' : lv.index }}</span>
                @if (lv.done) { <span class="st" aria-hidden="true">@for (i of [1, 2, 3]; track i) {<i [class.off]="i > lv.stars">★</i>}</span> }
                @else if (!lv.locked) { <span class="emo" aria-hidden="true">{{ lv.emoji }}</span> }
                @if (lv.done) { <span class="best">{{ lv.best }}</span> }
                @else if (lv.wip) { <span class="best">en cours</span> }
              </button>
            }
          </div>
          @if (doneHere() >= perDiff) {
            <p class="mk-muted">Difficulté terminée : le générateur « {{ diffDef().label }} » est ouvert dans « Affaires sur mesure ».</p>
          }
        </section>
      </div>
    </ion-content>
  `,
  styles: [`
    .tabs { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; margin-bottom: 12px; scrollbar-width: none; }
    .tabs::-webkit-scrollbar { display: none; }
    .tab { flex: 1 0 auto; min-width: 84px; min-height: 52px; display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 1px; padding: 6px 10px; border-radius: 12px; border: 1px solid var(--mk-border); background: var(--mk-fill); color: var(--ion-text-color); font-size: .82rem; }
    .tab small { font-size: .68rem; opacity: .7; }
    .tab.on { background: var(--ion-color-primary); color: var(--ion-color-primary-contrast); border-color: var(--ion-color-primary); }
    .count { font-size: .8rem; color: var(--mk-muted); font-variant-numeric: tabular-nums; }
    .bar { height: 5px; border-radius: 3px; background: var(--mk-border); margin: 10px 0 12px; overflow: hidden; }
    .bar span { display: block; height: 100%; background: var(--ion-color-primary); }
    .levels { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 7px; }
    .lv { position: relative; aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px;
      border-radius: 11px; border: 1px solid var(--mk-border); background: var(--mk-fill); color: var(--ion-text-color); padding: 2px; }
    .lv:active { transform: scale(.95); }
    .lv .num { font: 700 1.05rem Georgia, serif; line-height: 1; }
    .lv .emo { font-size: .8rem; line-height: 1; opacity: .85; }
    .lv .best { font-size: .58rem; color: var(--mk-success-text); font-variant-numeric: tabular-nums; }
    .lv.done { border-color: #2dd36f66; background: #2dd36f12; }
    .lv.wip { border-color: var(--ion-color-primary); }
    .lv.wip .best { color: var(--ion-color-primary); }
    .lv.locked { opacity: .45; border-style: dashed; }
    .lv.locked .num { font-size: .9rem; }
    .st { font-size: .62rem; color: var(--mk-gold-text); letter-spacing: -1px; }
    .st .off { color: var(--mk-off); font-style: normal; }
    .st i { font-style: normal; }
    .tab.locked { opacity: .6; border-style: dashed; }
    .scale { font-size: .75rem; margin: -4px 0 10px; }
    .lockmsg { color: var(--mk-gold-text); font-size: .85rem; margin: 0 0 10px; }
  `],
})
export class ClassicPage implements OnInit, ViewDidEnter {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private progress = inject(ProgressService);
  private audio = inject(AudioService);

  readonly difficulties = DIFFICULTIES;
  readonly perDiff = LEVELS_PER_DIFFICULTY;
  readonly diff = signal<Difficulty>('facile');
  readonly diffDef = computed(() => DIFFICULTIES.find((d) => d.id === this.diff())!);
  readonly doneHere = computed(() => this.countFor(this.diff()));

  /** Tuiles des niveaux (le décor suit la même rotation que tools/build-levels.ts). */
  readonly levels = computed(() => {
    const done = this.progress.done();
    const last = this.progress.lastSave();
    return Array.from({ length: LEVELS_PER_DIFFICULTY }, (_, i) => {
      const id = `${this.diff()}-${String(i + 1).padStart(2, '0')}`;
      const best = done[id]?.bestMs;
      const theme = THEME_LIST[i % THEME_LIST.length];
      return {
        id, index: i + 1, emoji: theme.emoji, themeName: theme.name,
        locked: !this.progress.levelUnlocked(id) || (i > 0 && !done[`${this.diff()}-${String(i).padStart(2, '0')}`]) || !this.diffOpen(this.diff()),
        stars: done[id]?.stars ?? 0,
        done: best !== undefined, best: best !== undefined ? formatTime(best) : '',
        wip: best === undefined && (last?.key === id || !!this.progress.getSave(id)),
      };
    });
  });

  readonly toUnlock = LEVELS_TO_UNLOCK_NEXT;
  readonly lockedTap = signal('');
  readonly scale = computed(() => STAR_TIMES[this.diff()]);
  readonly starsHere = computed(() => {
    const done = this.progress.done();
    return Object.entries(done).filter(([id]) => id.startsWith(this.diff() + '-')).reduce((k, [, d]) => k + (d.stars ?? 0), 0);
  });
  private readonly prevDiff = computed(() => DIFF_ORDER[Math.max(0, DIFF_ORDER.indexOf(this.diff()) - 1)]);
  readonly prevLabel = computed(() => DIFFICULTIES.find((d) => d.id === this.prevDiff())!.label);
  readonly missing = computed(() => Math.max(0, LEVELS_TO_UNLOCK_NEXT - this.countFor(this.prevDiff())));

  /** Lit progress.done() pour rester réactif. */
  diffOpen(d: Difficulty): boolean {
    const i = DIFF_ORDER.indexOf(d);
    return i <= 0 || this.countFor(DIFF_ORDER[i - 1]) >= LEVELS_TO_UNLOCK_NEXT;
  }

  async ngOnInit(): Promise<void> {
    await this.progress.load();
    const asked = this.route.snapshot.queryParamMap.get('d') as Difficulty | null;
    // Dernière difficulté ouverte et pas encore terminée.
    const first = [...DIFFICULTIES].reverse().find((d) => this.diffOpen(d.id) && !this.progress.generatorUnlocked(d.id));
    this.diff.set(asked && DIFFICULTIES.some((d) => d.id === asked) ? asked : first?.id ?? 'expert');
  }
  ionViewDidEnter(): void { this.audio.playMusic('menu'); }

  countFor(d: Difficulty): number {
    return Object.keys(this.progress.done()).filter((id) => id.startsWith(d + '-')).length;
  }

  open(lv: { id: string; index: number; locked: boolean }): void {
    if (lv.locked) {
      this.lockedTap.set(!this.diffOpen(this.diff())
        ? `Difficulté verrouillée : résous d'abord ${LEVELS_TO_UNLOCK_NEXT} affaires « ${this.prevLabel()} ».`
        : `Affaire ${lv.index} verrouillée : résous d'abord l'affaire ${lv.index - 1}.`);
      return;
    }
    this.lockedTap.set('');
    this.router.navigate(['/niveau', lv.id]);
  }
}
