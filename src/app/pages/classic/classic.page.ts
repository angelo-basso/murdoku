import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, ViewDidEnter } from '@ionic/angular/standalone';
import { THEME_LIST } from '../../core/data/deduction-themes';
import { DIFFICULTIES } from '../../core/engine/generator';
import { Difficulty } from '../../core/models/deduction.models';
import { AudioService } from '../../core/services/audio.service';
import { LEVELS_PER_DIFFICULTY, ProgressService, formatTime } from '../../core/services/progress.service';

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
            <button type="button" role="tab" class="tab" [class.on]="diff() === d.id" [attr.aria-selected]="diff() === d.id"
              [attr.aria-label]="d.label + ', grille ' + d.size + ' par ' + d.size + ', ' + countFor(d.id) + ' sur ' + perDiff + ' résolues'"
              (click)="diff.set(d.id)">
              <b>{{ d.label }}</b>
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
          <div class="levels">
            @for (lv of levels(); track lv.id) {
              <button type="button" class="lv" [class.done]="lv.done" [class.wip]="lv.wip" (click)="open(lv.id)"
                [attr.aria-label]="'Affaire ' + lv.index + ', ' + lv.themeName + (lv.done ? ', résolue en ' + lv.best : lv.wip ? ', en cours' : '')">
                <span class="num">{{ lv.index }}</span>
                <span class="emo" aria-hidden="true">{{ lv.emoji }}</span>
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
      gap: 1px; padding: 6px 10px; border-radius: 12px; border: 1px solid #ffffff1c; background: #ffffff08; color: var(--ion-text-color); font-size: .82rem; }
    .tab small { font-size: .68rem; opacity: .7; }
    .tab.on { background: var(--ion-color-primary); color: var(--ion-color-primary-contrast); border-color: var(--ion-color-primary); }
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
        done: best !== undefined, best: best !== undefined ? formatTime(best) : '',
        wip: best === undefined && (last?.key === id || !!this.progress.getSave(id)),
      };
    });
  });

  async ngOnInit(): Promise<void> {
    await this.progress.load();
    const asked = this.route.snapshot.queryParamMap.get('d') as Difficulty | null;
    const first = DIFFICULTIES.find((d) => !this.progress.generatorUnlocked(d.id));
    this.diff.set(asked && DIFFICULTIES.some((d) => d.id === asked) ? asked : first?.id ?? 'expert');
  }
  ionViewDidEnter(): void { this.audio.playMusic('menu'); }

  countFor(d: Difficulty): number {
    return Object.keys(this.progress.done()).filter((id) => id.startsWith(d + '-')).length;
  }

  open(id: string): void { this.router.navigate(['/niveau', id]); }
}
