import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonBadge,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonNote,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkCircle, search, skull } from 'ionicons/icons';
import { CASES } from '../../core/data/cases';
import { DEDUCTION_CASES } from '../../core/data/deduction-cases';
import { THEMES } from '../../core/data/deduction-themes';
import { Difficulty } from '../../core/models/deduction.models';
import { MurdokuCase } from '../../core/models/murdoku.models';
import { DeductionGeneratorService } from '../../core/services/deduction-generator.service';
import { StorageService } from '../../core/services/storage.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonIcon,
    IonBadge,
    IonLabel,
    IonNote,
  ],
  template: `
    <ion-content [fullscreen]="true" class="ion-padding home">
      <img class="logo" src="assets/brand/logo.svg" alt="Murdoku — Sudoku d'enquête" />
      <p class="tagline">Placez les suspects d'après les indices et démasquez le coupable.</p>

      <!-- Nouvelle enquête -->
      <section class="newgame">
        <h2 class="section">Nouvelle enquête</h2>
        <p class="label">Décor</p>
        <div class="chips">
          @for (t of themeList; track t.id) {
            <button type="button" class="chip" [class.on]="theme() === t.id" [attr.aria-pressed]="theme() === t.id" (click)="theme.set(t.id)">{{ t.label }}</button>
          }
        </div>
        <p class="label">Difficulté</p>
        <div class="chips">
          @for (d of diffs; track d.id) {
            <button type="button" class="chip diff" [class.on]="diff() === d.id" [attr.aria-pressed]="diff() === d.id" (click)="diff.set(d.id)">
              <b>{{ d.name }}</b><small>{{ d.size }}</small>
            </button>
          }
        </div>
        <button type="button" class="generate" (click)="newGame()">Lancer l'enquête</button>
      </section>

      <!-- Règles -->
      <section class="rules">
        <h2 class="section">Comment jouer</h2>
        <ol>
          <li><span class="n">1</span><p>Une seule personne par <b>ligne</b> et par <b>colonne</b>.</p></li>
          <li><span class="n">2</span><p>On se place sur un lit, une chaise, un canapé ou le sol — jamais sur un meuble <b>hachuré</b>.</p></li>
          <li><span class="n">3</span><p>Tous les <b>indices</b> doivent être respectés.</p></li>
          <li><span class="n">4</span><p>Le <b>coupable</b> est celui qui se retrouve seul avec la victime dans sa pièce.</p></li>
        </ol>
        <button type="button" class="tuto" (click)="openDeduction('manoir-6')">Faire l'affaire d'initiation</button>
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
  styles: [
    `
      .home { --pad-top: calc(env(safe-area-inset-top, 0px) + 12px); }
      .home::part(scroll) { padding-top: var(--pad-top); }
      .logo { display: block; width: 100%; max-width: 290px; margin: 8px auto 4px; }
      .tagline { color: #c9c1e2; font-size: 0.95rem; line-height: 1.4; margin: 4px auto 20px; text-align: center; max-width: 320px; }
      section { max-width: 460px; margin: 0 auto 16px; border-radius: 16px; padding: 16px; }
      .section { color: var(--ion-color-primary); font-family: var(--murdoku-font); font-size: 1.1rem; margin: 0 0 10px; }
      .label { margin: 10px 0 6px; font-size: 0.72rem; letter-spacing: .08em; text-transform: uppercase; color: #8f87ad; }
      .newgame { background: linear-gradient(180deg, #2a2250 0%, var(--ion-card-background) 85%); border: 1px solid #6c5ce7aa; }
      .chips { display: flex; gap: 8px; }
      .chip { flex: 1; min-height: 46px; padding: 8px 6px; border-radius: 11px;
        border: 1px solid rgba(212, 175, 55, 0.28); background: #ffffff08; color: var(--ion-text-color); font-size: 0.85rem;
        transition: background .15s, transform .1s; }
      .chip:active { transform: scale(.97); }
      .chip.diff { display: flex; flex-direction: column; align-items: center; gap: 1px; }
      .chip.diff small { font-size: 0.7rem; opacity: .7; }
      .chip.on { border-color: var(--ion-color-primary); background: var(--ion-color-primary); color: var(--ion-color-primary-contrast); font-weight: 700; }
      .chip.on small { opacity: .85; }
      .generate { width: 100%; margin: 16px 0 0; min-height: 52px; border-radius: 12px; border: none;
        background: var(--ion-color-primary); color: var(--ion-color-primary-contrast);
        font-family: var(--murdoku-font); font-size: 1.08rem; font-weight: 700; box-shadow: 0 6px 18px #d4af3733; }
      .generate:active { transform: scale(.98); }
      .rules { background: var(--ion-card-background); border: 1px solid #ffffff12; }
      .rules ol { list-style: none; margin: 0; padding: 0; }
      .rules li { display: flex; gap: 10px; align-items: flex-start; margin: 0 0 10px; font-size: 0.9rem; line-height: 1.4; color: #e3dcf5; }
      .rules li p { margin: 0; }
      .rules li .n { flex: 0 0 22px; height: 22px; border-radius: 50%; display: grid; place-items: center;
        background: #d4af3722; color: var(--ion-color-primary); font-size: 0.75rem; font-weight: 700; }
      .rules b { color: #fff; }
      .tuto { width: 100%; margin-top: 4px; min-height: 46px; border-radius: 12px; background: transparent;
        border: 1px solid rgba(212, 175, 55, 0.45); color: var(--ion-color-primary); font-size: 0.92rem; font-weight: 600; }
      .shared { padding-top: 4px; }
      .codebox { display: flex; gap: 8px; }
      .codebox input { flex: 1; min-width: 0; min-height: 46px; background: #0003; border: 1px solid #ffffff22;
        border-radius: 11px; color: var(--ion-text-color); padding: 0 12px; font-size: 0.85rem; }
      .codebox input:focus { outline: none; border-color: var(--ion-color-primary); }
      .codebox button { min-height: 46px; border: 1px solid rgba(212, 175, 55, 0.45); background: transparent;
        color: var(--ion-color-primary); border-radius: 11px; padding: 0 16px; font-size: 0.9rem; font-weight: 600; }
    `,
  ],
})
export class HomePage implements OnInit {
  private router = inject(Router);
  private storage = inject(StorageService);
  private gen = inject(DeductionGeneratorService);

  readonly cases = CASES;
  readonly deductionCases = DEDUCTION_CASES;
  readonly solved = signal<string[]>([]);

  readonly theme = signal('hante');
  readonly diff = signal<Difficulty>('moyen');
  readonly themeList = [
    { id: THEMES['manoir'].id, label: '🏰 Manoir' },
    { id: THEMES['hante'].id, label: '🎃 Manoir hanté' },
  ];
  readonly diffs: { id: Difficulty; name: string; size: string }[] = [
    { id: 'facile', name: 'Facile', size: '5×5' },
    { id: 'moyen', name: 'Moyen', size: '6×6' },
    { id: 'difficile', name: 'Difficile', size: '7×7' },
  ];

  constructor() {
    addIcons({ skull, search, checkmarkCircle });
  }

  async ngOnInit(): Promise<void> {
    this.solved.set(await this.storage.getSolved());
  }

  ionViewWillEnter(): void {
    this.storage.getSolved().then((s) => this.solved.set(s));
  }

  openDeduction(id: string): void {
    this.router.navigate(['/deduction', id]);
  }

  newGame(): void {
    for (let i = 0; i < 25; i++) {
      const seed = this.gen.randomSeed();
      const c = this.gen.generate({ themeId: this.theme(), difficulty: this.diff(), seed });
      if (c?.share) { this.router.navigate(['/deduction/gen', c.share]); return; }
    }
  }

  playCode(code: string): void {
    const trimmed = (code || '').trim();
    if (trimmed) this.router.navigate(['/deduction/gen', trimmed]);
  }

  difficultyColor(c: MurdokuCase): string {
    switch (c.difficulty) {
      case 'facile':
        return 'success';
      case 'moyen':
        return 'primary';
      default:
        return 'danger';
    }
  }

  open(c: MurdokuCase): void {
    this.router.navigate(['/game', c.id]);
  }
}
