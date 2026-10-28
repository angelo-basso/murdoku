import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, bulbOutline, refreshOutline, listOutline, createOutline, shareSocialOutline, pauseOutline, playOutline, timeOutline } from 'ionicons/icons';
import { findDeductionCase } from '../../core/data/deduction-cases';
import { Clue, DeductionCase, LevelDef } from '../../core/models/deduction.models';
import { DeductionGameService } from '../../core/services/deduction-game.service';
import { DeductionGeneratorService } from '../../core/services/deduction-generator.service';
import { DeductionSolverService } from '../../core/services/deduction-solver.service';
import { ProgressService, formatTime } from '../../core/services/progress.service';

interface CellVm {
  r: number; col: number;
  tint: string; furn: string | null; blocked: boolean;
  occupant: string | null; occAvatar: string | null; occName: string | null; occVictim: boolean;
  conflict: boolean; wallR: boolean; wallB: boolean;
  /** Case jouable pour la personne sélectionnée. */
  target: boolean;
  /** Ligne/colonne déjà prise par une autre personne (sélection active). */
  taken: boolean;
  elim: boolean; selectedHere: boolean;
  /** Barrée d'office : ligne ou colonne déjà occupée. */
  autoX: boolean;
}

type ClueState = 'ok' | 'bad' | 'pending';

const TINT: Record<string, string> = {
  A: '#1b2550', B: '#3a1c2e', C: '#241c42', D: '#20331f',
  E: '#2a2250', F: '#2d2436', G: '#2a2320', H: '#143036',
};

@Component({
  selector: 'app-deduction',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="goHome()" aria-label="Retour"><ion-icon slot="icon-only" name="arrow-back"></ion-icon></ion-button>
        </ion-buttons>
        <ion-title>{{ titleMain() }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="pause()" [disabled]="!game.currentCase() || !!game.culprit()" aria-label="Pause"><ion-icon slot="icon-only" name="pause-outline"></ion-icon></ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="ion-padding">
      @if (game.currentCase(); as c) {
        <!-- Barre d'infos compacte -->
        <div class="infobar">
          <span class="chip">{{ titleSub() }}{{ titleSub() ? ' · ' : '' }}{{ c.n }}×{{ c.n }}</span>
          <span class="timer" aria-label="Temps écoulé"><ion-icon name="time-outline"></ion-icon>{{ time() }}</span>
          <span class="progress">
            <span class="bar"><span class="fill" [style.width.%]="placedCount() / c.people.length * 100"></span></span>
            {{ placedCount() }}/{{ c.people.length }} placés
          </span>
        </div>

        <!-- Plateau -->
        <div class="board" [style.--n]="c.n" [class.selecting]="!!game.selected() && !game.notesMode()">
          @for (cell of cells(); track cell.r + '-' + cell.col) {
            <button type="button" class="cell"
              [class.blocked]="cell.blocked" [class.conflict]="cell.conflict"
              [class.wall-r]="cell.wallR" [class.wall-b]="cell.wallB"
              [class.target]="cell.target" [class.taken]="cell.taken"
              [attr.data-r]="cell.r" [attr.data-c]="cell.col"
              [attr.aria-label]="cellLabel(cell)"
              [style.background]="cell.tint" (click)="onCell(cell.r, cell.col)">
              @if (cell.furn) { <img class="furn" [src]="cell.furn" alt="" draggable="false" /> }
              @if (cell.occAvatar) {
                <img class="token" [class.victim]="cell.occVictim" [class.sel]="cell.selectedHere"
                  [src]="cell.occAvatar" [alt]="cell.occName!" draggable="false"
                  (pointerdown)="dragStart(cell.occupant!, $event)" />
              }
              @if (cell.elim) { <span class="xmark">✕</span> }
              @else if (cell.autoX) { <span class="xmark auto">✕</span> }
            </button>
          }
          <!-- Noms des pièces : calque au-dessus, lisibles et non tronqués par la case -->
          @for (lb of roomLabels(); track lb.room) {
            <span class="room-label" [style.left.%]="lb.left" [style.top.%]="lb.top" [style.max-width.%]="lb.max">{{ lb.name }}</span>
          }
        </div>

        <!-- Aide contextuelle -->
        <p class="status" [class.warn]="statusWarn()" aria-live="polite">
          {{ status() }}
          @if (selectedPlaced()) { <button type="button" class="unplace" (click)="onUnplace()">↩ Retirer</button> }
        </p>

        <!-- Personnes -->
        <div class="tray" [style.--n]="trayCols()">
          @for (p of people(); track p.id) {
            <button type="button" class="person" [class.sel]="p.selected" [class.placed]="p.placed"
              [class.victim]="p.victim" (pointerdown)="dragStart(p.id, $event)" (click)="onPerson(p.id)"
              [attr.aria-pressed]="p.selected" [attr.aria-label]="p.name + (p.placed ? ' (placé)' : '')">
              <img [src]="p.avatar" alt="" draggable="false" />
              <span>{{ p.short }}</span>
              @if (p.placed) { <i class="check" aria-hidden="true">✓</i> }
            </button>
          }
        </div>

        <!-- Contrôles -->
        <div class="controls">
          <button type="button" class="ctrl" [class.active]="game.notesMode()" (click)="game.toggleNotesMode()">
            <ion-icon name="create-outline"></ion-icon><span>Rature</span>
          </button>
          <button type="button" class="ctrl" (click)="onHint()">
            <ion-icon name="bulb-outline"></ion-icon><span>Indice</span>
          </button>
          <button type="button" class="ctrl" (click)="showClues = !showClues">
            <ion-icon name="list-outline"></ion-icon><span>{{ showClues ? 'Masquer' : 'Indices' }}</span>
          </button>
        </div>

        @if (showClues) {
          <h3 class="clues-title">Indices <small>· touche pour barrer</small></h3>
          <ol class="clues">
            @for (cl of clueStates(); track $index) {
              <li [class.ok]="cl.state === 'ok'" [class.bad]="cl.state === 'bad'" [class.struck]="cl.struck"
                (click)="toggleStrike($index)">
                <span class="mark" aria-hidden="true">{{ cl.state === 'ok' ? '✓' : cl.state === 'bad' ? '!' : '' }}</span>
                <span class="txt">{{ cl.text }}</span>
              </li>
            }
          </ol>
        }

        @if (share) {
          <button type="button" class="share" (click)="copyShare()">
            <ion-icon name="share-social-outline"></ion-icon>
            {{ copied ? 'Code copié ✓' : 'Partager : ' + share }}
          </button>
        }
      }

      @if (loading()) {
        <div class="loading"><div class="spinner"></div><p>Préparation de l'enquête…</p></div>
      }
      @if (error()) {
        <div class="loading"><p>{{ error() }}</p><ion-button (click)="goHome()">Retour</ion-button></div>
      }

      @if (game.paused() && !game.culprit()) {
        <div class="pause-overlay">
          <div class="pause-card">
            <h2>Pause</h2>
            <p class="ptime">{{ time() }}</p>
            <p class="phint">Ta partie est sauvegardée : tu pourras la reprendre plus tard depuis l'accueil.</p>
            <div class="acts">
              <ion-button expand="block" (click)="resume()"><ion-icon slot="start" name="play-outline"></ion-icon>Reprendre</ion-button>
              <ion-button expand="block" fill="outline" (click)="resetAll()"><ion-icon slot="start" name="refresh-outline"></ion-icon>Recommencer</ion-button>
              <ion-button expand="block" fill="clear" (click)="goHome()">Quitter</ion-button>
            </div>
          </div>
        </div>
      }

      @if (dragId(); as did) {
        <img class="drag-ghost" [src]="avatar(did)" [style.left.px]="dragX()" [style.top.px]="dragY()" alt="" />
      }

      @if (game.culprit(); as culprit) {
        <div class="reveal-overlay">
          <div class="confetti">
            @for (i of confettiBits; track i) { <span [style.left.%]="i.l" [style.background]="i.c" [style.animation-delay.s]="i.d"></span> }
          </div>
          <div class="reveal-card">
            <div class="stamp">AFFAIRE RÉSOLUE</div>
            <img class="culprit" [src]="avatar(culprit.id)" [alt]="culprit.name" />
            <h2>Le coupable&nbsp;: {{ culprit.name }}</h2>
            <p>Seul avec la victime, il ne pouvait être que le meurtrier.</p>
            <p class="ptime">⏱ {{ time() }}@if (bestTime()) { <small> · record {{ bestTime() }}</small> }</p>
            <div class="acts">
              @if (nextLevel(); as nx) {
                <ion-button expand="block" (click)="openLevel(nx.id)">Niveau suivant ({{ nx.index }}/20)</ion-button>
              }
              <ion-button expand="block" [fill]="nextLevel() ? 'outline' : 'solid'" (click)="goHome()">Retour aux affaires</ion-button>
              <ion-button expand="block" fill="clear" (click)="resetAll()">Rejouer</ion-button>
            </div>
          </div>
        </div>
      }
    </ion-content>
  `,
  styles: [`
    :host { --gold: var(--ion-color-primary); }
    .infobar { display: flex; align-items: center; justify-content: space-between; gap: 10px;
      max-width: 420px; margin: 0 auto 10px; font-size: 12px; color: #b9b0d6; }
    .chip { background: #ffffff10; border: 1px solid #ffffff1f; padding: 3px 9px; border-radius: 999px;
      text-transform: capitalize; white-space: nowrap; }
    .progress { display: flex; align-items: center; gap: 7px; white-space: nowrap; }
    .timer { display: inline-flex; align-items: center; gap: 4px; font-variant-numeric: tabular-nums; color: #e9e2fb; }
    .bar { width: 48px; height: 6px; border-radius: 3px; background: #ffffff18; overflow: hidden; }
    .fill { display: block; height: 100%; background: var(--gold); transition: width .25s ease; }

    .board {
      position: relative; display: grid;
      grid-template-columns: repeat(var(--n), minmax(0, 1fr));
      grid-template-rows: repeat(var(--n), minmax(0, 1fr));
      width: 100%; max-width: 420px; aspect-ratio: 1/1; margin: 0 auto 8px;
      background: #0d0a1c; border: 3px solid var(--gold);
      border-radius: 8px; overflow: hidden; touch-action: none;
    }
    .cell {
      position: relative; padding: 0; margin: 0; border: 1px solid #0007;
      min-width: 0; min-height: 0; overflow: hidden;
      display: flex; align-items: center; justify-content: center; cursor: pointer;
    }
    .cell.wall-r { border-right: 3px solid var(--gold); }
    .cell.wall-b { border-bottom: 3px solid var(--gold); }
    .cell.blocked { cursor: default; }
    .cell.blocked::after { content: ''; position: absolute; inset: 0; z-index: 2;
      background: repeating-linear-gradient(45deg, transparent 0 5px, rgba(0,0,0,0.45) 5px 7px), rgba(0,0,0,0.32); }
    .cell.blocked .furn { opacity: 0.45; filter: grayscale(0.6); }
    /* Guidage pendant la sélection */
    .cell.taken::before { content: ''; position: absolute; inset: 0; z-index: 2; background: rgba(8,5,18,0.55); }
    .cell.target::before { content: ''; position: absolute; inset: 2px; z-index: 2; border-radius: 4px;
      box-shadow: inset 0 0 0 2px rgba(212,175,55,0.75); animation: glow 1.4s ease-in-out infinite; }
    @keyframes glow { 50% { box-shadow: inset 0 0 0 2px rgba(212,175,55,0.25); } }

    .room-label {
      position: absolute; z-index: 4; pointer-events: none; margin: 2px 0 0 2px;
      padding: 1px 5px; border-radius: 4px; background: rgba(10,7,20,0.72);
      font: 600 9px/1.25 Georgia, serif; color: #f3d57a; letter-spacing: .2px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .furn { position: absolute; width: 86%; height: 86%; object-fit: contain; opacity: 0.92; }
    .token { position: absolute; inset: 0; margin: auto; width: 80%; height: 80%;
      object-fit: contain; z-index: 3; touch-action: none; filter: drop-shadow(0 2px 2px #000c);
      animation: pop .22s cubic-bezier(.3,1.6,.6,1); }
    .token.sel { filter: drop-shadow(0 0 3px var(--gold)) drop-shadow(0 0 2px var(--gold)); }
    .cell.conflict .token { filter: drop-shadow(0 0 3px var(--ion-color-danger)) drop-shadow(0 0 2px var(--ion-color-danger)); }
    @keyframes pop { from { transform: scale(.55); opacity: .4; } to { transform: scale(1); opacity: 1; } }

    .status { max-width: 420px; margin: 0 auto 10px; min-height: 18px; text-align: center;
      font-size: 13px; color: #cfc7e6; }
    .status.warn { color: #ff8a9a; }
    .unplace { margin-left: 6px; padding: 3px 10px; border-radius: 12px; border: 1px solid var(--gold);
      background: #d4af3722; color: var(--gold); font-weight: 700; font-size: .8rem; cursor: pointer; }

    .tray { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: 5px;
      max-width: 420px; margin: 0 auto 12px; }
    .person { position: relative; display: flex; flex-direction: column; align-items: center; gap: 3px;
      padding: 6px 2px 5px; border-radius: 10px; border: 1.5px solid rgba(212,175,55,0.25);
      background: var(--murdoku-cell-given-bg); color: var(--ion-text-color); cursor: pointer;
      touch-action: none; min-height: 72px; transition: transform .12s, background .12s; }
    .person:active { transform: scale(.96); }
    .person img { width: 100%; max-width: 44px; object-fit: contain; pointer-events: none; }
    .person span { font-size: 9px; line-height: 1.15; text-align: center; opacity: .9;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .person.sel { border-color: var(--gold); background: var(--murdoku-cell-selected-bg);
      box-shadow: 0 0 0 2px #d4af3755; }
    .person.placed { opacity: .45; }
    .person.placed.sel { opacity: 1; }
    .person.victim { border-color: #eb445a99; }
    .check { position: absolute; top: 3px; right: 4px; font-style: normal; font-size: 10px;
      color: #2dd36f; font-weight: 700; }

    .controls { display: flex; gap: 8px; max-width: 420px; margin: 0 auto 14px; }
    .ctrl { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 9px 4px;
      min-height: 52px; border: 1px solid rgba(212,175,55,0.3); border-radius: 12px; background: #ffffff06;
      color: var(--ion-text-color); font-size: 0.75rem; }
    .ctrl ion-icon { font-size: 1.3rem; }
    .ctrl.active { background: var(--gold); color: var(--ion-color-primary-contrast); border-color: var(--gold); }

    .clues-title { max-width: 420px; margin: 0 auto 6px; font: 600 14px Georgia, serif; color: var(--gold); }
    .clues-title small { font: 400 11px system-ui, sans-serif; color: #8f87ad; }
    .clues { max-width: 420px; margin: 0 auto 14px; padding: 0; list-style: none; counter-reset: c; }
    .clues li { display: flex; gap: 9px; align-items: flex-start; padding: 8px 10px; margin: 0 0 6px;
      border-radius: 10px; background: #ffffff08; border: 1px solid #ffffff10; font-size: 13.5px;
      line-height: 1.35; color: #ece6f8; cursor: pointer; }
    .clues .mark { flex: 0 0 20px; height: 20px; border-radius: 50%; display: grid; place-items: center;
      font-size: 11px; font-weight: 700; border: 1px solid #ffffff2a; color: transparent; }
    .clues li.ok { border-color: #2dd36f55; }
    .clues li.ok .mark { background: #2dd36f; border-color: #2dd36f; color: #0b2a16; }
    .clues li.bad { border-color: #eb445a88; background: #eb445a14; }
    .clues li.bad .mark { background: #eb445a; border-color: #eb445a; color: #fff; }
    .clues li.struck .txt { text-decoration: line-through; opacity: .45; }

    .share { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%;
      max-width: 420px; margin: 0 auto 20px; padding: 10px; border-radius: 10px;
      border: 1px dashed rgba(212,175,55,0.4); background: transparent; color: #cdb766; font-size: 12px; }

    .xmark { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      color: #ff5d72; font-weight: 800; font-size: 1.15rem; pointer-events: none; z-index: 3;
      text-shadow: 0 1px 2px #000; }
    .xmark.auto { color: #8f87ad; font-size: .85rem; font-weight: 600; opacity: .75; }
    .loading { position: fixed; inset: 0; z-index: 40; display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 14px; background: var(--ion-background-color); color: #cfc7e6; text-align: center; padding: 24px; }
    .spinner { width: 38px; height: 38px; border-radius: 50%; border: 3px solid #ffffff22; border-top-color: var(--gold);
      animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .pause-overlay { position: fixed; inset: 0; z-index: 45; display: flex; align-items: center; justify-content: center;
      background: rgba(10,7,20,0.96); padding: 24px; }
    .pause-card { width: 100%; max-width: 320px; text-align: center; }
    .pause-card h2 { font: 700 1.6rem Georgia, serif; color: var(--gold); margin: 0 0 4px; }
    .ptime { font-size: 1.1rem; font-variant-numeric: tabular-nums; color: #e9e2fb; margin: 4px 0 8px; }
    .ptime small { color: #9a8fc0; font-size: .85rem; }
    .phint { font-size: 13px; color: #9a8fc0; margin: 0 0 16px; }
    .drag-ghost { position: fixed; width: 58px; height: 64px; transform: translate(-50%, -70%) scale(1.1);
      pointer-events: none; z-index: 60; filter: drop-shadow(0 6px 8px #000c); }

    .reveal-overlay { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center;
      justify-content: center; background: rgba(10,7,20,0.85); padding: 24px; animation: fade .3s ease; }
    @keyframes fade { from { opacity: 0; } }
    .reveal-card { background: var(--ion-card-background); border: 2px solid var(--gold);
      border-radius: 18px; padding: 24px; text-align: center; max-width: 340px; width: 100%;
      animation: rise .35s cubic-bezier(.2,1.3,.5,1); }
    @keyframes rise { from { transform: translateY(24px) scale(.95); opacity: 0; } }
    .reveal-card .culprit { width: 120px; height: 120px; object-fit: contain; }
    .reveal-card h2 { font-family: Georgia, serif; color: var(--gold); margin: 6px 0; }
    .stamp { display: inline-block; border: 2px solid var(--ion-color-danger); color: var(--ion-color-danger);
      transform: rotate(-7deg); padding: 2px 10px; border-radius: 6px; font-weight: 700; letter-spacing: 2px;
      font-size: 0.7rem; margin-bottom: 10px; }
    .acts { display: flex; flex-direction: column; gap: 6px; margin-top: 14px; }
    .confetti { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
    .confetti span { position: absolute; top: -12px; width: 8px; height: 12px; border-radius: 2px;
      animation: fall 2.4s linear infinite; }
    @keyframes fall { 0% { transform: translateY(-20px) rotate(0); opacity: 1; }
      100% { transform: translateY(105vh) rotate(540deg); opacity: 0.9; } }

    @media (prefers-reduced-motion: reduce) {
      .token, .reveal-card, .reveal-overlay, .cell.target::before { animation: none; }
      .confetti { display: none; }
    }
  `],
})
export class DeductionPage implements OnInit, OnDestroy {
  game = inject(DeductionGameService);
  private solver = inject(DeductionSolverService);
  private gen = inject(DeductionGeneratorService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private progress = inject(ProgressService);

  showClues = true;
  readonly loading = signal(true);
  readonly error = signal('');
  private level: LevelDef | null = null;
  private levels: LevelDef[] = [];
  private saveRoute: string[] = [];
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  copied = false;
  private readonly struck = signal<Set<number>>(new Set());

  // Glisser-déposer (pointeur : souris + tactile)
  readonly dragId = signal<string | null>(null);
  readonly dragX = signal(0);
  readonly dragY = signal(0);
  private candidate: string | null = null;
  private startX = 0;
  private startY = 0;
  private moved = false;

  readonly confettiBits = Array.from({ length: 36 }, () => ({
    l: Math.round(Math.random() * 100),
    c: ['#d4af37', '#6c5ce7', '#eb445a', '#2dd36f', '#f3d57a'][Math.floor(Math.random() * 5)],
    d: +(Math.random() * 0.8).toFixed(2),
  }));

  constructor() {
    addIcons({ arrowBack, refreshOutline, bulbOutline, listOutline, createOutline, shareSocialOutline, pauseOutline, playOutline, timeOutline });

    // Retour haptique : léger à chaque pose, succès à la résolution.
    let lastCount = 0;
    effect(() => {
      const n = this.placedCount();
      if (n > lastCount) this.haptic('light');
      lastCount = n;
    });
    let recorded: string | null = null;
    effect(() => {
      const c = this.game.currentCase();
      if (!this.game.culprit() || !c || recorded === c.id) return;
      recorded = c.id;
      this.haptic('success');
      const ms = untracked(() => this.game.elapsed());
      this.progress.recordWin(c.id, ms, !!this.level);
    }, { allowSignalWrites: true });

    // Sauvegarde automatique (différée) à chaque coup.
    effect(() => {
      this.game.placement(); this.game.elim(); this.struck();
      if (this.loading() || this.game.culprit()) return;
      if (this.saveTimer) clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => this.saveNow(), 600);
    });
  }

  private haptic(kind: 'light' | 'success'): void {
    try {
      if (kind === 'success') void Haptics.notification({ type: NotificationType.Success });
      else void Haptics.impact({ style: ImpactStyle.Light });
    } catch { /* web sans vibration : ignoré */ }
  }

  dragStart(id: string, ev: PointerEvent): void {
    ev.preventDefault();
    this.candidate = id;
    this.startX = ev.clientX;
    this.startY = ev.clientY;
    this.moved = false;
    this.dragX.set(ev.clientX);
    this.dragY.set(ev.clientY);
  }

  @HostListener('document:pointermove', ['$event'])
  onMove(ev: PointerEvent): void {
    if (!this.candidate) return;
    if (!this.moved && Math.hypot(ev.clientX - this.startX, ev.clientY - this.startY) > 6) {
      this.moved = true;
      this.dragId.set(this.candidate);
    }
    if (this.moved) {
      ev.preventDefault(); // empêche le scroll pendant le drag (mobile)
      this.dragX.set(ev.clientX);
      this.dragY.set(ev.clientY);
    }
  }

  @HostListener('document:pointerup', ['$event'])
  onUp(ev: PointerEvent): void {
    const id = this.candidate;
    this.candidate = null;
    if (!id) return;
    if (this.moved) {
      this.dragId.set(null);
      const el = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
      const cell = el?.closest('.cell') as HTMLElement | null;
      if (cell?.dataset['r'] != null) this.game.placePerson(id, +cell.dataset['r']!, +cell.dataset['c']!);
      else if (!el?.closest('.board')) this.game.removePerson(id); // lâché hors du plateau → retour à la réserve
    }
    // sinon : simple tap, géré par (click)
  }

  async ngOnInit(): Promise<void> {
    await this.progress.load();
    const params = this.route.snapshot.paramMap;
    const levelId = params.get('id');
    const code = params.get('code');
    const caseId = params.get('caseId');
    let c: DeductionCase | null = null;

    if (levelId) {
      this.levels = (await import('../../core/data/levels.data')).LEVELS;
      this.level = this.levels.find((l) => l.id === levelId) ?? null;
      c = this.level ? structuredClone(this.level.case) : null;
      this.saveRoute = ['/niveau', levelId];
    } else if (code) {
      // Laisse l'écran de chargement s'afficher avant le calcul (jusqu'à ~3 s en expert).
      await new Promise((r) => setTimeout(r, 30));
      const opts = this.gen.parseCode(code);
      c = opts ? this.gen.generate(opts) : null;
      this.saveRoute = ['/deduction/gen', code];
    } else if (caseId) {
      c = findDeductionCase(caseId) ?? null;
      this.saveRoute = ['/deduction', caseId];
    }

    if (!c) { this.loading.set(false); this.error.set('Affaire introuvable.'); return; }
    const saved = this.progress.getSave(c.id);
    this.game.start(c, saved ?? undefined);
    if (saved) this.struck.set(new Set(saved.struck));
    this.loading.set(false);
  }

  ngOnDestroy(): void {
    this.saveNow();
    this.game.stopClock();
  }

  /** Mise en pause automatique quand l'app passe en arrière-plan. */
  @HostListener('document:visibilitychange')
  onVisibility(): void {
    if (document.hidden && this.game.currentCase() && !this.game.culprit()) { this.game.pause(); this.saveNow(); }
  }

  private saveNow(): void {
    const c = this.game.currentCase();
    if (!c || this.loading() || this.game.culprit() || !this.saveRoute.length) return;
    if (!this.placedCount() && this.game.elapsed() < 5000) return; // rien d'intéressant à reprendre
    const snap = this.game.snapshot();
    this.progress.save(c.id, { ...snap, struck: [...this.struck()], savedAt: Date.now(), title: this.titleLong(), route: this.saveRoute });
  }

  pause(): void { this.game.pause(); this.saveNow(); }
  resume(): void { this.game.resume(); }

  readonly time = computed(() => formatTime(this.game.elapsed()));
  readonly bestTime = computed(() => {
    const id = this.game.currentCase()?.id;
    const best = id ? this.progress.done()[id]?.bestMs : undefined;
    return best !== undefined ? formatTime(best) : '';
  });
  readonly nextLevel = computed(() => {
    if (!this.level || !this.game.culprit()) return null;
    return this.levels.find((l) => l.difficulty === this.level!.difficulty && l.index === this.level!.index + 1) ?? null;
  });
  openLevel(id: string): void { this.router.navigate(['/niveau', id], { replaceUrl: true }); }

  private titleLong(): string {
    const base = this.game.currentCase()?.title ?? '';
    return this.level ? `${base} · n°${this.level.index}` : base;
  }

  // --- En-tête ---
  readonly titleMain = computed(() => {
    const t = (this.game.currentCase()?.title ?? '').split(' · ')[0];
    return this.level ? `${t} · n°${this.level.index}` : t;
  });
  readonly titleSub = computed(() => (this.game.currentCase()?.title ?? '').split(' · ')[1] ?? '');

  get share(): string | undefined { return this.game.currentCase()?.share; }
  async copyShare(): Promise<void> {
    const s = this.share;
    if (!s) return;
    try { await navigator.clipboard.writeText(s); this.copied = true; setTimeout(() => (this.copied = false), 1500); } catch { /* ignore */ }
  }

  avatar(id: string): string { return `assets/characters/${id}.svg`; }

  furnPath(code: string): string | null {
    const type = code.split(':')[0];
    if (type === 'vide') return null;
    return `assets/furniture/${code.replace(':', '-')}.svg`;
  }

  /** Au-delà de 6 personnes, la rangée passe sur deux lignes. */
  readonly trayCols = computed(() => {
    const n = this.game.currentCase()?.people.length ?? 6;
    return n <= 6 ? n : Math.ceil(n / 2);
  });

  readonly placedCount = computed(() => {
    const place = this.game.placement();
    return Object.values(place).filter((p) => !!p).length;
  });

  /** Lignes/colonnes occupées par d'autres que la personne sélectionnée. */
  private readonly takenLines = computed(() => {
    const sel = this.game.selected();
    const rows = new Set<number>(), cols = new Set<number>();
    for (const [id, p] of Object.entries(this.game.placement())) {
      if (!p || id === sel) continue;
      rows.add(p[0]); cols.add(p[1]);
    }
    return { rows, cols };
  });

  readonly cells = computed<CellVm[]>(() => {
    const c = this.game.currentCase();
    if (!c) return [];
    const conflicts = this.game.conflicts();
    const sel = this.game.selected();
    const notes = this.game.notesMode();
    const elimSet = this.game.eliminatedForSelected();
    const { rows, cols } = this.takenLines();
    const guiding = !!sel && !notes;
    const out: CellVm[] = [];
    for (let r = 0; r < c.n; r++) {
      for (let col = 0; col < c.n; col++) {
        const room = c.rooms[r][col];
        const occ = this.game.occupantAt(r, col);
        const occPerson = occ ? c.people.find((p) => p.id === occ)! : null;
        const blocked = !this.solver.occupiable(c, r, col);
        const lineTaken = rows.has(r) || cols.has(col);
        const elim = !!sel && !occ && elimSet.has(`${r},${col}`);
        out.push({
          r, col,
          tint: c.tints?.[room] ?? TINT[room] ?? '#241c42', furn: this.furnPath(c.furniture[r][col]), blocked,
          occupant: occ, occAvatar: occ ? this.avatar(occ) : null, occName: occPerson?.name ?? null,
          occVictim: !!occPerson?.victim,
          conflict: !!occ && conflicts.has(occ),
          wallR: col < c.n - 1 && c.rooms[r][col] !== c.rooms[r][col + 1],
          wallB: r < c.n - 1 && c.rooms[r][col] !== c.rooms[r + 1][col],
          taken: guiding && !blocked && !occ && lineTaken,
          target: guiding && !blocked && !occ && !lineTaken && !elim,
          elim, selectedHere: !!occ && occ === sel,
          autoX: !blocked && !occ && lineTaken,
        });
      }
    }
    return out;
  });

  /** Étiquettes de pièces positionnées sur la première case de chaque pièce. */
  readonly roomLabels = computed(() => {
    const c = this.game.currentCase();
    if (!c) return [];
    const seen = new Set<string>();
    const out: { room: string; name: string; left: number; top: number; max: number }[] = [];
    for (let r = 0; r < c.n; r++) for (let col = 0; col < c.n; col++) {
      const room = c.rooms[r][col];
      if (seen.has(room)) continue;
      seen.add(room);
      out.push({ room, name: c.roomNames[room], left: (col / c.n) * 100, top: (r / c.n) * 100, max: ((c.n - col) / c.n) * 100 - 2 });
    }
    return out;
  });

  readonly people = computed(() => {
    const c = this.game.currentCase();
    if (!c) return [];
    const sel = this.game.selected();
    const compact = c.people.length > 6;
    return c.people.map((p) => ({
      id: p.id, name: p.name, short: compact ? p.name.split(/,| le | la | l'/)[0] : p.name.replace(/^(Le |La |L')/, ''),
      avatar: this.avatar(p.id), victim: !!p.victim,
      placed: this.game.isPlaced(p.id), selected: sel === p.id,
    }));
  });

  /** État de chaque indice au regard du placement courant. */
  readonly clueStates = computed(() => {
    const c = this.game.currentCase();
    if (!c) return [];
    const place = this.game.placement();
    const struck = this.struck();
    return c.clues.map((cl, i) => ({ text: cl.text, state: this.clueState(c, cl, place), struck: struck.has(i) }));
  });

  private clueState(c: NonNullable<ReturnType<DeductionGameService['currentCase']>>, cl: Clue, place: ReturnType<DeductionGameService['placement']>): ClueState {
    if (cl.who) {
      const p = place[cl.who];
      if (!p) return 'pending';
      return this.solver.unaryOk(c, cl, cl.who, p[0], p[1]) ? 'ok' : 'bad';
    }
    if (cl.a && cl.b) {
      if (!place[cl.a] || !place[cl.b]) return 'pending';
      return this.solver.binaryOk(c, cl, place) ? 'ok' : 'bad';
    }
    return 'pending';
  }

  readonly badClues = computed(() => this.clueStates().filter((c) => c.state === 'bad').length);

  readonly status = computed(() => {
    const c = this.game.currentCase();
    if (!c || this.game.culprit()) return '';
    const sel = this.game.selected();
    const name = sel ? c.people.find((p) => p.id === sel)?.name : '';
    if (this.game.notesMode()) {
      return sel ? `Rature : touche les cases où ${name} ne peut pas être.` : 'Rature : choisis d\'abord un personnage.';
    }
    if (this.game.conflicts().size) return 'Deux personnes partagent une ligne ou une colonne.';
    if (this.badClues()) return `${this.badClues()} indice${this.badClues() > 1 ? 's' : ''} non respecté${this.badClues() > 1 ? 's' : ''} (en rouge).`;
    if (sel && this.game.isPlaced(sel)) return `${name} : touche une autre case pour le déplacer.`;
    if (sel) return `${name} : touche une case dorée, ou fais glisser le portrait.`;
    if (this.placedCount() === c.people.length) return 'Tout le monde est placé… vérifie les indices.';
    if (this.placedCount()) return 'Choisis un personnage, puis une case. Touche un portrait posé pour le déplacer.';
    return 'Choisis un personnage, puis une case.';
  });
  readonly statusWarn = computed(() => !this.game.notesMode() && (this.game.conflicts().size > 0 || this.badClues() > 0));

  cellLabel(cell: CellVm): string {
    if (cell.occName) return cell.occName;
    if (cell.blocked) return 'Case bloquée';
    return `Case ligne ${cell.r + 1}, colonne ${cell.col + 1}`;
  }

  onCell(r: number, col: number): void { this.game.tapCell(r, col); }
  onPerson(id: string): void { this.game.selectPerson(id); }
  readonly selectedPlaced = computed(() => {
    const sel = this.game.selected();
    return !!sel && !this.game.notesMode() && !!this.game.placement()[sel];
  });
  onUnplace(): void {
    const sel = this.game.selected();
    if (sel) { this.game.removePerson(sel); this.game.selectPerson(sel); }
  }
  onHint(): void { this.game.hint(); }
  toggleStrike(i: number): void {
    const s = new Set(this.struck());
    if (s.has(i)) s.delete(i); else s.add(i);
    this.struck.set(s);
  }
  resetAll(): void {
    this.game.reset();
    this.struck.set(new Set());
    const c = this.game.currentCase();
    if (c) this.progress.clearSave(c.id);
  }
  goHome(): void { this.router.navigate(["/home"]); }
}
