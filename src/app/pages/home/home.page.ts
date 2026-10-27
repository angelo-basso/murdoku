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
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-title>Les affaires</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="ion-padding">
      <img class="logo" src="assets/brand/logo.svg" alt="Murdoku — Sudoku d'enquête" />
      <p class="tagline">
        Menez l'enquête&nbsp;: placez les suspects d'après les indices et
        démasquez le coupable&nbsp;🔍
      </p>

      <!-- Nouvelle enquête (déduction, vraies règles) -->
      <section class="newgame">
        <h2 class="section">🕵️ Nouvelle enquête</h2>
        <div class="chips">
          @for (t of themeList; track t.id) {
            <button type="button" class="chip" [class.on]="theme() === t.id" (click)="theme.set(t.id)">{{ t.label }}</button>
          }
        </div>
        <div class="chips">
          @for (d of diffs; track d.id) {
            <button type="button" class="chip" [class.on]="diff() === d.id" (click)="diff.set(d.id)">{{ d.label }}</button>
          }
        </div>
        <button type="button" class="generate" (click)="newGame()">Lancer l'enquête</button>
        <div class="codebox">
          <input #code placeholder="coller un code d'affaire partagé…" />
          <button type="button" (click)="playCode(code.value)">Jouer</button>
        </div>
        <button type="button" class="tuto" (click)="openDeduction('manoir-6')">Essayer le didacticiel →</button>
      </section>
    </ion-content>
  `,
  styles: [
    `
      .logo {
        display: block;
        width: 100%;
        max-width: 300px;
        margin: 6px auto 2px;
      }
      .brand {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-family: var(--murdoku-font);
        letter-spacing: 1px;
      }
      .tagline {
        opacity: 0.85;
        font-size: 0.95rem;
        margin: 4px 0 18px;
        text-align: center;
      }
      .cases {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .case-card {
        text-align: left;
        width: 100%;
        background: var(--ion-card-background);
        border: 1px solid rgba(212, 175, 55, 0.3);
        border-radius: 14px;
        padding: 14px;
        color: var(--ion-text-color);
        cursor: pointer;
      }
      .case-card:active {
        transform: scale(0.99);
      }
      .head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .title {
        font-family: var(--murdoku-font);
        font-size: 1.15rem;
        font-weight: 700;
        color: var(--ion-color-primary);
      }
      .solved {
        color: var(--ion-color-success);
        font-size: 1.3rem;
      }
      .meta {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 8px 0;
        text-transform: capitalize;
      }
      .victim {
        font-size: 0.9rem;
        margin: 6px 0 10px;
        opacity: 0.9;
      }
      .avatars {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
      }
      .avatar {
        width: 30px;
        height: 30px;
        object-fit: contain;
      }
      .avatar.pix {
        width: 38px;
        height: 42px;
      }
      .featured {
        border-color: var(--ion-color-secondary);
        background: linear-gradient(180deg, #2a2250 0%, var(--ion-card-background) 70%);
      }
      .section {
        color: var(--ion-color-primary);
        font-family: var(--murdoku-font);
        font-size: 1rem;
        margin: 20px 0 10px;
        opacity: 0.9;
      }
      .newgame {
        background: linear-gradient(180deg, #2a2250 0%, var(--ion-card-background) 80%);
        border: 1px solid var(--ion-color-secondary);
        border-radius: 14px;
        padding: 14px;
      }
      .newgame .section { margin-top: 0; }
      .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
      .chip {
        flex: 1; min-width: 90px; padding: 8px 6px; border-radius: 9px;
        border: 1px solid rgba(212, 175, 55, 0.3); background: var(--murdoku-cell-given-bg);
        color: var(--ion-text-color); font-size: 0.8rem;
      }
      .chip.on { border-color: var(--ion-color-primary); background: var(--ion-color-primary); color: var(--ion-color-primary-contrast); font-weight: 700; }
      .generate {
        width: 100%; margin: 6px 0; padding: 12px; border-radius: 10px; border: none;
        background: var(--ion-color-primary); color: var(--ion-color-primary-contrast);
        font-family: var(--murdoku-font); font-size: 1rem; font-weight: 700;
      }
      .codebox { display: flex; gap: 6px; margin-top: 6px; }
      .codebox input {
        flex: 1; background: #0003; border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 8px;
        color: var(--ion-text-color); padding: 8px; font-size: 0.8rem;
      }
      .codebox button {
        border: 1px solid rgba(212, 175, 55, 0.4); background: transparent; color: var(--ion-color-primary);
        border-radius: 8px; padding: 0 12px; font-size: 0.8rem;
      }
      .tuto { background: transparent; border: none; color: #9a8fc0; font-size: 0.8rem; margin-top: 8px; text-decoration: underline; }
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
  readonly diffs: { id: Difficulty; label: string }[] = [
    { id: 'facile', label: 'Facile · 5×5' },
    { id: 'moyen', label: 'Moyen · 6×6' },
    { id: 'difficile', label: 'Difficile · 7×7' },
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
