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
import { MurdokuCase } from '../../core/models/murdoku.models';
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
        Résolvez la grille&nbsp;: chaque symbole est un suspect. Complétez
        l'enquête pour démasquer le coupable&nbsp;🔍
      </p>

      <div class="cases">
        @for (c of cases; track c.id) {
          <button type="button" class="case-card" (click)="open(c)">
            <div class="head">
              <span class="title">{{ c.title }}</span>
              @if (solved().includes(c.id)) {
                <ion-icon class="solved" name="checkmark-circle"></ion-icon>
              }
            </div>
            <div class="meta">
              <ion-badge [color]="difficultyColor(c)">{{
                c.difficulty
              }}</ion-badge>
              <ion-note>Grille {{ c.size }}×{{ c.size }}</ion-note>
              <ion-note>{{ c.suspects.length }} suspects</ion-note>
            </div>
            <p class="victim">
              Victime&nbsp;: <strong>{{ c.victim }}</strong> — {{ c.location }}
            </p>
            <div class="avatars">
              @for (s of c.suspects; track s.id) {
                <img class="avatar" [src]="s.avatar" [alt]="s.name" [title]="s.name" />
              }
            </div>
          </button>
        }
      </div>
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
    `,
  ],
})
export class HomePage implements OnInit {
  private router = inject(Router);
  private storage = inject(StorageService);

  readonly cases = CASES;
  readonly solved = signal<string[]>([]);

  constructor() {
    addIcons({ skull, search, checkmarkCircle });
  }

  async ngOnInit(): Promise<void> {
    this.solved.set(await this.storage.getSolved());
  }

  ionViewWillEnter(): void {
    this.storage.getSolved().then((s) => this.solved.set(s));
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
