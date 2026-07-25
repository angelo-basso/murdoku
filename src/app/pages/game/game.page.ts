import { CommonModule } from '@angular/common';
import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBack,
  backspaceOutline,
  bulbOutline,
  createOutline,
  refreshOutline,
  timeOutline,
  warningOutline,
} from 'ionicons/icons';
import { BoardComponent } from '../../components/board/board.component';
import { SuspectPadComponent } from '../../components/suspect-pad/suspect-pad.component';
import { findCase } from '../../core/data/cases';
import { MurdokuService } from '../../core/services/murdoku.service';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon,
    BoardComponent,
    SuspectPadComponent,
  ],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="goHome()">
            <ion-icon slot="icon-only" name="arrow-back"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>{{ murdoku.currentCase()?.title }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="newGame()">
            <ion-icon slot="icon-only" name="refresh-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="ion-padding">
      @if (murdoku.currentCase(); as c) {
        <div class="statusbar">
          <span><ion-icon name="time-outline"></ion-icon> {{ time() }}</span>
          <span
            [class.warn]="(murdoku.state()?.mistakes ?? 0) > 0"
          >
            <ion-icon name="warning-outline"></ion-icon>
            {{ murdoku.state()?.mistakes ?? 0 }} erreur(s)
          </span>
          <span>{{ murdoku.remaining() }} restantes</span>
        </div>

        @if (showIntro()) {
          <div class="intro" (click)="showIntro.set(false)">
            <p>{{ c.intro }}</p>
            <small>La case 🔍 révélera le coupable. (toucher pour masquer)</small>
          </div>
        }

        <app-board></app-board>

        <div class="controls">
          <button
            type="button"
            class="ctrl"
            [class.active]="murdoku.notesMode()"
            (click)="murdoku.toggleNotesMode()"
          >
            <ion-icon name="create-outline"></ion-icon>
            <span>Notes</span>
          </button>
          <button type="button" class="ctrl" (click)="murdoku.erase()">
            <ion-icon name="backspace-outline"></ion-icon>
            <span>Effacer</span>
          </button>
          <button type="button" class="ctrl" (click)="murdoku.hint()">
            <ion-icon name="bulb-outline"></ion-icon>
            <span>Indice</span>
          </button>
        </div>

        <app-suspect-pad></app-suspect-pad>
      }

      @if (solved() && murdoku.culprit(); as culprit) {
        <div class="reveal-overlay">
          <div class="reveal-card">
            <div class="stamp">AFFAIRE RÉSOLUE</div>
            <div class="culprit-emoji">{{ culprit.emoji }}</div>
            <h2>Le coupable est&nbsp;: {{ culprit.name }}</h2>
            <p class="motive">Mobile&nbsp;: {{ culprit.motive }}.</p>
            <p class="recap">
              Résolu en {{ time() }} · {{ murdoku.state()?.mistakes }} erreur(s)
              · {{ murdoku.state()?.hintsUsed }} indice(s)
            </p>
            <div class="reveal-actions">
              <ion-button expand="block" (click)="goHome()"
                >Autres affaires</ion-button
              >
              <ion-button expand="block" fill="outline" (click)="newGame()"
                >Rejouer</ion-button
              >
            </div>
          </div>
        </div>
      }
    </ion-content>
  `,
  styles: [
    `
      .statusbar {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        font-size: 0.85rem;
        margin-bottom: 12px;
        opacity: 0.9;
      }
      .statusbar ion-icon {
        vertical-align: -2px;
      }
      .statusbar .warn {
        color: var(--ion-color-danger);
      }
      .intro {
        background: rgba(212, 175, 55, 0.12);
        border-left: 3px solid var(--ion-color-primary);
        border-radius: 8px;
        padding: 10px 12px;
        margin-bottom: 14px;
        font-size: 0.9rem;
      }
      .intro small {
        display: block;
        margin-top: 6px;
        opacity: 0.7;
      }
      .controls {
        display: flex;
        justify-content: center;
        gap: 10px;
        margin: 16px auto;
        max-width: 460px;
      }
      .ctrl {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        padding: 8px;
        border: 1px solid rgba(212, 175, 55, 0.3);
        border-radius: 10px;
        background: transparent;
        color: var(--ion-text-color);
        font-size: 0.72rem;
      }
      .ctrl ion-icon {
        font-size: 1.35rem;
      }
      .ctrl.active {
        background: var(--ion-color-primary);
        color: var(--ion-color-primary-contrast);
      }
      .reveal-overlay {
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(10, 7, 20, 0.82);
        z-index: 50;
        padding: 24px;
      }
      .reveal-card {
        background: var(--ion-card-background);
        border: 2px solid var(--ion-color-primary);
        border-radius: 18px;
        padding: 24px;
        text-align: center;
        max-width: 360px;
        width: 100%;
      }
      .stamp {
        display: inline-block;
        border: 2px solid var(--ion-color-danger);
        color: var(--ion-color-danger);
        transform: rotate(-8deg);
        padding: 2px 10px;
        border-radius: 6px;
        font-weight: 700;
        letter-spacing: 2px;
        font-size: 0.7rem;
        margin-bottom: 12px;
      }
      .culprit-emoji {
        font-size: 4rem;
        line-height: 1;
      }
      .reveal-card h2 {
        font-family: var(--murdoku-font);
        color: var(--ion-color-primary);
        margin: 8px 0;
      }
      .motive {
        opacity: 0.9;
      }
      .recap {
        font-size: 0.8rem;
        opacity: 0.7;
        margin: 10px 0 16px;
      }
      .reveal-actions {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
    `,
  ],
})
export class GamePage implements OnInit, OnDestroy {
  murdoku = inject(MurdokuService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly showIntro = signal(true);
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastTick = 0;

  readonly solved = computed(() => this.murdoku.state()?.completed ?? false);
  readonly time = computed(() => {
    const ms = this.murdoku.state()?.elapsedMs ?? 0;
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60)
      .toString()
      .padStart(2, '0');
    const s = (total % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  });

  constructor() {
    addIcons({
      arrowBack,
      refreshOutline,
      timeOutline,
      warningOutline,
      createOutline,
      backspaceOutline,
      bulbOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('caseId');
    const c = id ? findCase(id) : undefined;
    if (!c) {
      this.router.navigate(['/home']);
      return;
    }
    await this.murdoku.start(c);
    this.startTimer();
  }

  ngOnDestroy(): void {
    this.stopTimer();
    void this.murdoku.persist();
  }

  private startTimer(): void {
    this.stopTimer();
    this.lastTick = Date.now();
    this.timer = setInterval(() => {
      const now = Date.now();
      this.murdoku.tick(now - this.lastTick);
      this.lastTick = now;
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async newGame(): Promise<void> {
    const c = this.murdoku.currentCase();
    if (!c) return;
    this.showIntro.set(true);
    await this.murdoku.start(c, true);
    this.startTimer();
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }
}
