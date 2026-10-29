import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar, NavController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, bulbOutline, refreshOutline, listOutline, createOutline, searchOutline, shareSocialOutline, pauseOutline, playOutline, timeOutline } from 'ionicons/icons';
import { findDeductionCase } from '../../core/data/deduction-cases';
import { FURNITURE, furnName } from '../../core/data/deduction-themes';
import { AnnouncerService } from '../../core/services/announcer.service';
import { AudioService, MusicId } from '../../core/services/audio.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { Clue, DeductionCase, Difficulty, LevelDef } from '../../core/models/deduction.models';
import { DeductionGameService } from '../../core/services/deduction-game.service';
import { DeductionGeneratorService } from '../../core/services/deduction-generator.service';
import { DeductionSolverService } from '../../core/services/deduction-solver.service';
import { ProgressService, STAR_TIMES, caseFingerprint, formatTime, starsFor } from '../../core/services/progress.service';

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
          <ion-button (click)="goHome()" aria-label="Retour à la liste"><ion-icon slot="icon-only" name="arrow-back"></ion-icon></ion-button>
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
          <span class="timer" [attr.aria-label]="'Temps écoulé ' + time()" role="timer"><ion-icon name="time-outline"></ion-icon>{{ time() }}</span>
          @if (rated()) {
            <span class="stars-live" [attr.aria-label]="liveStars() + ' étoiles possibles' + (nextDrop() ? ', une de moins après ' + nextDrop() : '')">
              @for (i of [1, 2, 3]; track i) { <span [class.off]="i > liveStars()">★</span> }
            </span>
          }
          <span class="progress">
            <span class="bar"><span class="fill" [style.width.%]="placedCount() / c.people.length * 100"></span></span>
            {{ placedCount() }}/{{ c.people.length }} placés
          </span>
        </div>

        <!-- Plateau -->
        <h2 class="sr-only">Plateau</h2>
        <div class="board" [style.--n]="c.n" [style.--gold]="progress.frameColor()" [class.selecting]="!!game.selected() && !game.notesMode()"
          role="group" [attr.aria-label]="'Plateau de ' + c.n + ' lignes et ' + c.n + ' colonnes. Flèches du clavier pour se déplacer.'"
          (keydown)="onBoardKey($event)">
          @for (cell of cells(); track cell.r + '-' + cell.col) {
            <button type="button" class="cell"
              [class.blocked]="cell.blocked" [class.conflict]="cell.conflict"
              [class.wall-r]="cell.wallR" [class.wall-b]="cell.wallB"
              [class.target]="cell.target" [class.taken]="cell.taken" [class.flagged]="!!cell.occupant && flagged().has(cell.occupant)"
              [attr.data-r]="cell.r" [attr.data-c]="cell.col"
              [attr.aria-label]="cellLabel(cell)" [attr.tabindex]="cell.r === focusR() && cell.col === focusC() ? 0 : -1"
              (focus)="focusR.set(cell.r); focusC.set(cell.col)"
              [style.background]="cell.tint" (click)="onCell(cell.r, cell.col)">
              @if (cell.furn) { <img class="furn" [src]="cell.furn" alt="" draggable="false" /> }
              @if (cell.occAvatar) {
                <img class="token" [class.victim]="cell.occVictim" [class.sel]="cell.selectedHere"
                  [src]="cell.occAvatar" alt="" draggable="false"
                  (pointerdown)="dragStart(cell.occupant!, $event)" />
              }
              @if (cell.elim) { <span class="xmark" aria-hidden="true">✕</span> }
              @else if (cell.autoX) { <span class="xmark auto" aria-hidden="true">✕</span> }
            </button>
          }
          <!-- Noms des pièces : calque au-dessus, lisibles et non tronqués par la case -->
          @for (lb of roomLabels(); track lb.room) {
            <span class="room-label" aria-hidden="true" [style.left.%]="lb.left" [style.top.%]="lb.top" [style.max-width.%]="lb.max">{{ lb.name }}</span>
          }
        </div>

        @if (shopNudge()) {
          <p class="nudge" role="alert">{{ shopNudge() }} <button type="button" (click)="openShop()">Boutique</button></p>
        }
        <!-- Aide contextuelle -->
        <p class="status" [class.warn]="statusWarn()">
          {{ status() }}
          @if (selectedPlaced()) { <button type="button" class="unplace" (click)="onUnplace()">↩ Retirer</button> }
        </p>

        <!-- Personnes -->
        <h2 class="sr-only">Personnes à placer</h2>
        <div class="tray" [style.--n]="trayCols()">
          @for (p of people(); track p.id) {
            <button type="button" class="person" [class.sel]="p.selected" [class.placed]="p.placed"
              [class.victim]="p.victim" (pointerdown)="dragStart(p.id, $event)" (click)="onPerson(p.id)"
              [attr.aria-pressed]="p.selected" [attr.aria-label]="p.label">
              <img [src]="p.avatar" alt="" draggable="false" />
              <span>{{ p.short }}</span>
              @if (p.victim) { <i class="skull" aria-hidden="true">💀</i> }
              @if (p.placed) { <i class="check" aria-hidden="true">✓</i> }
            </button>
          }
        </div>

        <!-- Contrôles -->
        <div class="controls">
          <button type="button" class="ctrl" [class.active]="game.notesMode()" [attr.aria-pressed]="game.notesMode()" (click)="toggleNotes()">
            <ion-icon name="create-outline"></ion-icon><span>Rature</span>
          </button>
          <button type="button" class="ctrl" (click)="onHint()"
            [attr.aria-label]="'Indice : place correctement une personne. ' + (tutorial ? 'Gratuit dans l’initiation.' : progress.inventory().hints + ' restant' + (progress.inventory().hints > 1 ? 's' : '') + '.')">
            <ion-icon name="bulb-outline"></ion-icon><span>Indice</span>
            <b class="badge" aria-hidden="true">{{ tutorial ? '∞' : progress.inventory().hints }}</b>
          </button>
          <button type="button" class="ctrl" (click)="onLoupe()"
            [attr.aria-label]="'Loupe : signale les personnes mal placées. ' + (tutorial ? 'Gratuite dans l’initiation.' : progress.inventory().loupes + ' restante' + (progress.inventory().loupes > 1 ? 's' : '') + '.')">
            <ion-icon name="search-outline"></ion-icon><span>Loupe</span>
            <b class="badge" aria-hidden="true">{{ tutorial ? '∞' : progress.inventory().loupes }}</b>
          </button>
          <button type="button" class="ctrl" (click)="showClues = !showClues" [attr.aria-expanded]="showClues">
            <ion-icon name="list-outline"></ion-icon><span>{{ showClues ? 'Masquer' : 'Indices' }}</span>
          </button>
        </div>

        @if (showClues) {
          <h2 class="clues-title">Indices <small>· touche pour barrer</small></h2>
          <ol class="clues">
            @for (cl of clueStates(); track $index) {
              <li [class.ok]="cl.state === 'ok'" [class.bad]="cl.state === 'bad'" [class.struck]="cl.struck">
                <button type="button" class="clue-btn" (click)="toggleStrike($index)" [attr.aria-pressed]="cl.struck"
                  [attr.aria-label]="'Indice ' + ($index + 1) + ' : ' + cl.text + ' ' + stateLabel(cl.state) + (cl.struck ? ' Barré.' : '')">
                  <span class="mark" aria-hidden="true">{{ cl.state === 'ok' ? '✓' : cl.state === 'bad' ? '!' : '' }}</span>
                  <span class="txt">{{ cl.text }}</span>
                </button>
              </li>
            }
          </ol>

          <!-- Plan des pièces, pour les lecteurs d'écran -->
          <section class="sr-only" aria-label="Plan des pièces">
            <h2>Plan des pièces</h2>
            <ul>
              @for (rm of roomPlan(); track rm.name) { <li>{{ rm.text }}</li> }
            </ul>
          </section>
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
          <div class="pause-card" role="dialog" aria-modal="true" aria-labelledby="pause-title">
            <h2 id="pause-title" tabindex="-1" class="dlg-focus">Pause</h2>
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
        <img class="drag-ghost" aria-hidden="true" [src]="avatar(did)" [style.left.px]="dragX()" [style.top.px]="dragY()" alt="" />
      }

      @if (game.culprit(); as culprit) {
        <div class="reveal-overlay">
          <div class="confetti" aria-hidden="true">
            @for (i of confettiBits; track i) { <span [style.left.%]="i.l" [style.background]="i.c" [style.animation-delay.s]="i.d"></span> }
          </div>
          <div class="reveal-card" role="dialog" aria-modal="true" aria-labelledby="reveal-title">
            <div class="stamp" aria-hidden="true">AFFAIRE RÉSOLUE</div>
            <img class="culprit" [src]="avatar(culprit.id)" alt="" />
            <h2 id="reveal-title" tabindex="-1" class="dlg-focus">Le coupable&nbsp;: {{ culprit.name }}</h2>
            <p>Seul suspect dans la pièce de la victime : c'est le meurtrier.</p>
            @if (result(); as res) {
              <p class="stars-big" [attr.aria-label]="res.stars + ' étoile' + (res.stars > 1 ? 's' : '') + ' sur 3'">
                @for (i of [1, 2, 3]; track i) { <span [class.off]="i > res.stars" [style.animation-delay.s]="i * 0.18">★</span> }
              </p>
              @if (res.gained) { <p class="gain">+{{ res.gained }} étoile{{ res.gained > 1 ? 's' : '' }} · solde {{ progress.balance() }} ★</p> }
            }
            <p class="ptime">⏱ {{ time() }}@if (bestTime()) { <small> · record {{ bestTime() }}</small> }</p>
            <div class="acts">
              @if (nextLevel(); as nx) {
                <ion-button expand="block" (click)="openLevel(nx.id)">Affaire suivante ({{ nx.index }}/20)</ion-button>
              }
              <ion-button expand="block" [fill]="nextLevel() ? 'outline' : 'solid'" (click)="goHome()">{{ level ? 'Retour aux affaires' : 'Retour' }}</ion-button>
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
      max-width: 420px; margin: 0 auto 10px; font-size: 12px; color: var(--mk-muted); }
    .chip { background: var(--mk-fill); border: 1px solid var(--mk-border); padding: 3px 9px; border-radius: 999px;
      text-transform: capitalize; white-space: nowrap; }
    .progress { display: flex; align-items: center; gap: 7px; white-space: nowrap; }
    .timer { display: inline-flex; align-items: center; gap: 4px; font-variant-numeric: tabular-nums; color: var(--mk-text-soft); }
    .bar { width: 48px; height: 6px; border-radius: 3px; background: var(--mk-border); overflow: hidden; }
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
      background: repeating-linear-gradient(45deg, transparent 0 6px, rgba(0,0,0,0.38) 6px 8px), rgba(0,0,0,0.12); }
    .cell.blocked .furn { opacity: 0.8; filter: grayscale(0.35); }
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
      font-size: 13px; color: var(--mk-muted); }
    .status.warn { color: var(--mk-danger-text); }
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
    .person.victim { border-color: #eb445a; background: #eb445a1c; }
    .person.victim img, .token.victim { filter: grayscale(.75) brightness(.9) drop-shadow(0 0 2px #eb445a); }
    .skull { position: absolute; top: 2px; left: 4px; font-style: normal; font-size: 11px; }
    .check { position: absolute; top: 3px; right: 4px; font-style: normal; font-size: 10px;
      color: var(--mk-success-text); font-weight: 700; }

    .controls { display: flex; gap: 8px; max-width: 420px; margin: 0 auto 14px; }
    .ctrl { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 9px 4px;
      min-height: 52px; border: 1px solid rgba(212,175,55,0.3); border-radius: 12px; background: var(--mk-fill);
      color: var(--ion-text-color); font-size: 0.75rem; }
    .ctrl ion-icon { font-size: 1.3rem; }
    .ctrl { position: relative; }
    .badge { position: absolute; top: 4px; right: 6px; min-width: 18px; height: 18px; padding: 0 4px; border-radius: 9px;
      background: var(--gold); color: #1a1426; font-size: .68rem; line-height: 18px; text-align: center; }
    .stars-live { color: var(--gold); letter-spacing: 1px; font-size: 13px; }
    .stars-live .off, .stars-big .off { color: var(--mk-off); }
    .stars-big { margin: 2px 0 0; font-size: 2.1rem; color: var(--mk-gold-text); letter-spacing: 6px; }
    .stars-big span { display: inline-block; animation: starpop .45s cubic-bezier(.3,1.6,.6,1) both; }
    @keyframes starpop { from { transform: scale(0); opacity: 0; } }
    .gain { margin: 0 0 4px; color: var(--mk-success-text); font-weight: 700; font-size: .9rem; }
    .cell.flagged::after { content: ''; position: absolute; inset: 1px; z-index: 4; border-radius: 4px; pointer-events: none;
      box-shadow: inset 0 0 0 3px #eb445a; animation: glow 0.8s ease-in-out infinite; }
    .nudge { max-width: 420px; margin: 0 auto 8px; text-align: center; color: var(--mk-gold-text); font-size: 12.5px; }
    .nudge button { margin-left: 6px; padding: 3px 10px; border-radius: 12px; border: 1px solid var(--gold); background: #d4af3722;
      color: var(--gold); font-weight: 700; font-size: .8rem; }
    .ctrl.active { background: var(--gold); color: var(--ion-color-primary-contrast); border-color: var(--gold); }

    .clues-title { max-width: 420px; margin: 0 auto 6px; font: 600 14px Georgia, serif; color: var(--gold); }
    .clues-title small { font: 400 11px system-ui, sans-serif; color: var(--mk-dim); }
    .clues { max-width: 420px; margin: 0 auto 14px; padding: 0; list-style: none; counter-reset: c; }
    .clues li { display: flex; gap: 9px; align-items: flex-start; padding: 8px 10px; margin: 0 0 6px;
      border-radius: 10px; background: var(--mk-fill); border: 1px solid var(--mk-fill); font-size: 13.5px;
      line-height: 1.35; color: var(--mk-text-soft); cursor: pointer; }
    .clues .mark { flex: 0 0 20px; height: 20px; border-radius: 50%; display: grid; place-items: center;
      font-size: 11px; font-weight: 700; border: 1px solid var(--mk-off); color: transparent; }
    .clues li.ok { border-color: #2dd36f55; }
    .clues li.ok .mark { background: #2dd36f; border-color: #2dd36f; color: #0b2a16; }
    .clues li.bad { border-color: #eb445a88; background: #eb445a14; }
    .clues li.bad .mark { background: #eb445a; border-color: #eb445a; color: #fff; }
    .clues li.struck .txt { text-decoration: line-through; opacity: .45; }

    .share { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%;
      max-width: 420px; margin: 0 auto 20px; padding: 10px; border-radius: 10px;
      border: 1px dashed rgba(212,175,55,0.4); background: transparent; color: var(--mk-gold-text); font-size: 12px; }

    .xmark { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      color: var(--mk-danger-text); font-weight: 800; font-size: 1.15rem; pointer-events: none; z-index: 3;
      text-shadow: 0 1px 2px #000; }
    .xmark.auto { color: var(--mk-dim); font-size: .85rem; font-weight: 600; opacity: .75; }
    .loading { position: fixed; inset: 0; z-index: 40; display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 14px; background: var(--ion-background-color); color: var(--mk-muted); text-align: center; padding: 24px; }
    .spinner { width: 38px; height: 38px; border-radius: 50%; border: 3px solid var(--mk-border); border-top-color: var(--gold);
      animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .pause-overlay { position: fixed; inset: 0; z-index: 45; display: flex; align-items: center; justify-content: center;
      background: rgba(10,7,20,0.96); padding: 24px; }
    .pause-card { width: 100%; max-width: 320px; text-align: center; }
    .pause-card h2 { font: 700 1.6rem Georgia, serif; color: var(--gold); margin: 0 0 4px; }
    .ptime { font-size: 1.1rem; font-variant-numeric: tabular-nums; color: var(--mk-text-soft); margin: 4px 0 8px; }
    .ptime small { color: var(--mk-muted); font-size: .85rem; }
    .phint { font-size: 13px; color: var(--mk-muted); margin: 0 0 16px; }
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

    .clue-btn { all: unset; display: flex; gap: 10px; align-items: flex-start; width: 100%; cursor: pointer; }
    .clue-btn:focus-visible { outline: 3px solid var(--mk-gold-text); outline-offset: 2px; border-radius: 6px; }
    .dlg-focus:focus { outline: none; }
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
  readonly progress = inject(ProgressService);
  private feedback = inject(FeedbackService);
  private announcer = inject(AnnouncerService);
  private audio = inject(AudioService);
  private nav = inject(NavController);
  private music: MusicId = 'manoir';

  showClues = true;
  /** Affaire d'initiation : indices et loupes gratuits, pas de note. */
  tutorial = false;
  private difficulty: Difficulty = 'facile';
  readonly result = signal<{ stars: number; gained: number } | null>(null);
  readonly flagged = signal<Set<string>>(new Set());
  readonly shopNudge = signal('');
  private recorded: string | null = null;
  /** Jeton de la partie lancée par cet écran (le service de jeu est partagé). */
  private session = -1;
  private owns(): boolean { return this.session >= 0 && this.game.isSession(this.session); }
  /** Case qui reçoit le focus clavier (navigation aux flèches). */
  readonly focusR = signal(0);
  readonly focusC = signal(0);
  readonly loading = signal(true);
  readonly error = signal('');
  level: LevelDef | null = null;
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
    addIcons({ arrowBack, refreshOutline, bulbOutline, listOutline, createOutline, searchOutline, shareSocialOutline, pauseOutline, playOutline, timeOutline });

    // Son, vibration et annonces vocales à chaque coup.
    let prev: Record<string, [number, number] | null> = {};
    let prevCase: string | null = null;
    effect(() => {
      const c = this.game.currentCase();
      const place = this.game.placement();
      if (!c || !this.owns()) return;
      if (prevCase !== c.id || this.loading()) { prevCase = c.id; prev = { ...place }; return; }
      for (const p of c.people) {
        const a = prev[p.id], b = place[p.id];
        if (a?.[0] === b?.[0] && a?.[1] === b?.[1]) continue;
        if (b) { this.feedback.emit('place'); this.announcer.say(this.whereText(p.name, b[0], b[1])); }
        else { this.feedback.emit('remove'); this.announcer.say(`${p.name} retourne dans la réserve.`); }
      }
      prev = { ...place };
    });
    // Erreur : nouveau conflit ou indice contredit.
    let lastErr = 0;
    effect(() => {
      const err = this.game.conflicts().size + this.badClues();
      if (err > lastErr && !this.loading() && this.owns()) {
        this.feedback.emit('error');
        untracked(() => this.announcer.say(this.errorText()));
      }
      lastErr = err;
    });
    let lastElim = 0;
    effect(() => {
      const n = Object.values(this.game.elim()).reduce((k, set) => k + set.size, 0);
      if (n !== lastElim && !this.loading() && this.owns()) this.feedback.emit('note');
      lastElim = n;
    });
    effect(() => {
      const c = this.game.currentCase();
      const culprit = this.game.culprit();
      if (!culprit || !c || this.recorded === c.id || !this.owns()) return;
      this.recorded = c.id;
      this.feedback.emit('win');
      const ms = untracked(() => this.game.elapsed());
      const kind = this.level ? 'level' : this.tutorial ? 'tutorial' : 'custom';
      const res = this.progress.recordWin(c.id, ms, kind, this.difficulty);
      this.result.set(kind === 'tutorial' ? null : res);
      this.announcer.alert(`Affaire résolue ! Le coupable est ${culprit.name}. Temps : ${formatTime(ms)}.`
        + (kind !== 'tutorial' ? ` ${res.stars} étoile${res.stars > 1 ? 's' : ''} sur 3${res.gained ? `, ${res.gained} gagnée${res.gained > 1 ? 's' : ''}` : ''}.` : ''));
      setTimeout(() => (document.querySelector('#reveal-title') as HTMLElement | null)?.focus(), 300);
    }, { allowSignalWrites: true });

    // Sauvegarde automatique (différée) à chaque coup.
    effect(() => {
      this.game.placement(); this.game.elim(); this.struck();
      if (this.loading() || this.game.culprit()) return;
      if (this.saveTimer) clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => this.saveNow(), 600);
    });
  }

  /** « Sofia la Peintre est en ligne 3, colonne 2, dans « Salon », sur un canapé. » */
  private whereText(name: string, r: number, col: number): string {
    const c = this.game.currentCase()!;
    const f = c.furniture[r][col];
    const on = FURNITURE[f]?.on;
    return `${name} est en ligne ${r + 1}, colonne ${col + 1}, dans « ${c.roomNames[c.rooms[r][col]]} »${on ? ', ' + on : ''}.`;
  }

  private errorText(): string {
    const c = this.game.currentCase()!;
    const bad = this.clueStates().filter((x) => x.state === 'bad').map((x) => x.text);
    const names = [...this.game.conflicts()].map((id) => c.people.find((p) => p.id === id)?.name).filter(Boolean);
    if (names.length) return `Attention : ${names.join(' et ')} partagent une ligne, une colonne ou une pièce.`;
    return bad.length ? `Indice contredit : ${bad[0]}` : 'Erreur.';
  }

  stateLabel(st: ClueState): string {
    return st === 'ok' ? 'Respecté.' : st === 'bad' ? 'Contredit.' : 'À vérifier.';
  }

  toggleNotes(): void {
    this.game.toggleNotesMode();
    this.announcer.say(this.game.notesMode() ? 'Mode rature activé : choisis une personne puis les cases où elle ne peut pas être.' : 'Mode rature désactivé.');
  }

  /** Navigation au clavier dans le plateau (flèches, début/fin). */
  onBoardKey(ev: KeyboardEvent): void {
    const c = this.game.currentCase();
    if (!c) return;
    let r = this.focusR(), col = this.focusC();
    switch (ev.key) {
      case 'ArrowUp': r = Math.max(0, r - 1); break;
      case 'ArrowDown': r = Math.min(c.n - 1, r + 1); break;
      case 'ArrowLeft': col = Math.max(0, col - 1); break;
      case 'ArrowRight': col = Math.min(c.n - 1, col + 1); break;
      case 'Home': col = 0; break;
      case 'End': col = c.n - 1; break;
      default: return;
    }
    ev.preventDefault();
    this.focusR.set(r); this.focusC.set(col);
    (document.querySelector(`.cell[data-r="${r}"][data-c="${col}"]`) as HTMLElement | null)?.focus();
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
    if (this.level && !this.progress.levelUnlocked(this.level.id)) {
      this.loading.set(false);
      this.error.set('Affaire verrouillée : résous d\'abord l\'affaire précédente.');
      return;
    }
    this.tutorial = !this.level && !code;
    this.difficulty = this.level?.difficulty ?? (code ? this.gen.parseCode(code)?.difficulty : undefined) ?? 'facile';
    this.music = (this.level?.theme ?? (code ? this.gen.parseCode(code)?.themeId : 'manoir') ?? 'manoir') as MusicId;
    this.audio.playMusic(this.music);
    let saved = this.progress.getSave(c.id);
    if (saved && saved.fp !== caseFingerprint(c)) { this.progress.clearSave(c.id); saved = null; } // niveau modifié depuis
    this.session = this.game.start(c, saved ?? undefined);
    if (saved) this.struck.set(new Set(saved.struck));
    this.loading.set(false);
  }

  ionViewDidEnter(): void { if (this.game.currentCase()) this.audio.playMusic(this.music); }

  ngOnDestroy(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    if (!this.owns()) return; // une autre affaire a déjà pris la main
    this.saveNow();
    this.game.stopClock(this.session);
  }

  /** Mise en pause automatique quand l'app passe en arrière-plan. */
  @HostListener('document:visibilitychange')
  onVisibility(): void {
    if (document.hidden && this.owns() && !this.game.culprit()) { this.game.pause(); this.saveNow(); }
  }

  private saveNow(): void {
    if (!this.owns()) return;
    const c = this.game.currentCase();
    if (!c || this.loading() || this.game.culprit() || !this.saveRoute.length) return;
    if (!this.placedCount() && this.game.elapsed() < 5000) return; // rien d'intéressant à reprendre
    const snap = this.game.snapshot();
    this.progress.save(c.id, { ...snap, struck: [...this.struck()], savedAt: Date.now(), title: this.titleLong(), route: this.saveRoute, fp: caseFingerprint(c) });
  }

  pause(): void {
    this.game.pause(); this.saveNow();
    setTimeout(() => (document.querySelector('#pause-title') as HTMLElement | null)?.focus(), 100);
  }
  resume(): void { this.game.resume(); this.announcer.say('Partie reprise.'); }

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

  /**
   * Pièces déjà « pleines » pour la personne sélectionnée (ou pour tous si aucune) :
   * une personne par pièce, la victime pouvant seule partager la sienne avec un suspect.
   */
  readonly closedRooms = computed(() => {
    const c = this.game.currentCase();
    const closed = new Set<string>();
    if (!c) return closed;
    const sel = this.game.selected();
    const place = this.game.placement();
    const selIsVictim = !!sel && !!c.people.find((p) => p.id === sel)?.victim;
    const byRoom: Record<string, string[]> = {};
    for (const p of c.people) {
      const pp = place[p.id];
      if (pp && p.id !== sel) (byRoom[c.rooms[pp[0]][pp[1]]] ??= []).push(p.id);
    }
    for (const [room, ids] of Object.entries(byRoom)) {
      const hasVictim = ids.some((id) => c.people.find((p) => p.id === id)?.victim);
      if (ids.length >= 2 || (sel && !selIsVictim && !hasVictim)) closed.add(room);
    }
    return closed;
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
    const closed = this.closedRooms();
    const out: CellVm[] = [];
    for (let r = 0; r < c.n; r++) {
      for (let col = 0; col < c.n; col++) {
        const room = c.rooms[r][col];
        const occ = this.game.occupantAt(r, col);
        const occPerson = occ ? c.people.find((p) => p.id === occ)! : null;
        const blocked = !this.solver.occupiable(c, r, col);
        const lineTaken = rows.has(r) || cols.has(col) || closed.has(room);
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
    const place = this.game.placement();
    const compact = c.people.length > 6;
    return c.people.map((p) => ({
      id: p.id, name: p.name, short: compact ? p.name.split(/,| le | la | l'/)[0] : p.name.replace(/^(Le |La |L')/, ''),
      avatar: this.avatar(p.id), victim: !!p.victim,
      placed: this.game.isPlaced(p.id), selected: sel === p.id,
      label: p.name + (p.victim ? ', la victime' : '') + (place[p.id] ? `, en ligne ${place[p.id]![0] + 1}, colonne ${place[p.id]![1] + 1}` : ', pas encore placé'),
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
    if (this.game.conflicts().size) return 'Deux personnes partagent une ligne, une colonne ou une pièce (seul le meurtrier rejoint la victime).';
    if (this.badClues()) return `${this.badClues()} indice${this.badClues() > 1 ? 's' : ''} non respecté${this.badClues() > 1 ? 's' : ''} (en rouge).`;
    if (sel && this.game.isPlaced(sel)) return `${name} : touche une autre case pour le déplacer.`;
    if (sel) return `${name} : touche une case dorée, ou fais glisser le portrait.`;
    if (this.placedCount() === c.people.length) return 'Tout le monde est placé… vérifie les indices.';
    if (this.placedCount()) return 'Choisis un personnage, puis une case. Touche un portrait posé pour le déplacer.';
    return 'Choisis un personnage, puis une case.';
  });
  readonly statusWarn = computed(() => !this.game.notesMode() && (this.game.conflicts().size > 0 || this.badClues() > 0));

  /** Lecture complète d'une case pour les lecteurs d'écran. */
  cellLabel(cell: CellVm): string {
    const c = this.game.currentCase()!;
    const code = c.furniture[cell.r][cell.col];
    const parts = [`Ligne ${cell.r + 1}, colonne ${cell.col + 1}`, c.roomNames[c.rooms[cell.r][cell.col]], furnName(code)];
    if (cell.blocked) parts.push('case bloquée');
    else if (cell.occName) parts.push(`occupée par ${cell.occName}${cell.conflict ? ', en conflit' : ''}${cell.selectedHere ? ', sélectionnée' : ''}`);
    else if (cell.elim) parts.push('raturée');
    else if (cell.autoX) parts.push('exclue : ligne, colonne ou pièce déjà prise');
    else parts.push('libre');
    return parts.join(', ');
  }

  /** Plan textuel : chaque pièce, ses cases et ses meubles. */
  readonly roomPlan = computed(() => {
    const c = this.game.currentCase();
    if (!c) return [];
    const byRoom = new Map<string, string[]>();
    for (let r = 0; r < c.n; r++) for (let col = 0; col < c.n; col++) {
      const id = c.rooms[r][col];
      const free = this.solver.occupiable(c, r, col);
      const list = byRoom.get(id) ?? [];
      list.push(`ligne ${r + 1} colonne ${col + 1} : ${furnName(c.furniture[r][col])}${free ? '' : ' (bloquée)'}`);
      byRoom.set(id, list);
    }
    return [...byRoom.entries()].map(([id, cells]) => ({ name: c.roomNames[id], text: `${c.roomNames[id]} : ${cells.join(' ; ')}.` }));
  });

  onCell(r: number, col: number): void {
    const before = this.game.selected();
    this.game.tapCell(r, col);
    const after = this.game.selected();
    if (after && after !== before) {
      this.feedback.emit('select');
      const name = this.game.currentCase()!.people.find((p) => p.id === after)!.name;
      this.announcer.say(`Sélection : ${name}. Choisis une autre case pour le déplacer, ou touche-le à nouveau pour le retirer.`);
    }
  }
  onPerson(id: string): void {
    this.game.selectPerson(id);
    const c = this.game.currentCase()!;
    const sel = this.game.selected();
    if (sel) {
      this.feedback.emit('select');
      const name = c.people.find((p) => p.id === sel)!.name;
      const free = this.cells().filter((x) => x.target).length;
      this.announcer.say(this.game.notesMode() ? `Rature pour ${name}.` : `Sélection : ${name}. ${free} case${free > 1 ? 's' : ''} possible${free > 1 ? 's' : ''}.`);
    }
  }
  readonly selectedPlaced = computed(() => {
    const sel = this.game.selected();
    return !!sel && !this.game.notesMode() && !!this.game.placement()[sel];
  });
  onUnplace(): void {
    const sel = this.game.selected();
    if (sel) { this.game.removePerson(sel); this.game.selectPerson(sel); }
  }
  onHint(): void {
    if (!this.tutorial && this.progress.inventory().hints <= 0) { this.nudge('Plus d\'indice en réserve.'); return; }
    if (!this.game.hint()) { this.announcer.say('Tout le monde est déjà bien placé.'); return; }
    if (!this.tutorial) this.progress.use('hints');
    this.feedback.emit('hint');
    this.shopNudge.set('');
  }

  /** Loupe : entoure en rouge les personnes mal placées pendant quelques secondes. */
  onLoupe(): void {
    if (!this.tutorial && this.progress.inventory().loupes <= 0) { this.nudge('Plus de loupe en réserve.'); return; }
    const c = this.game.currentCase();
    if (!c || !this.placedCount()) { this.announcer.say('Pose d\'abord des personnes à vérifier.'); return; }
    if (!this.tutorial) this.progress.use('loupes');
    const wrong = this.game.wrongPlaced();
    this.flagged.set(new Set(wrong));
    setTimeout(() => this.flagged.set(new Set()), 3500);
    const names = wrong.map((id) => c.people.find((p) => p.id === id)!.name);
    this.feedback.emit(wrong.length ? 'error' : 'hint');
    this.announcer.say(wrong.length ? `Loupe : mal placé${wrong.length > 1 ? 's' : ''} : ${names.join(', ')}.` : 'Loupe : toutes les personnes posées sont bien placées.');
    this.shopNudge.set('');
  }

  private nudge(msg: string): void {
    this.feedback.emit('error');
    this.shopNudge.set(`${msg} Gagne des étoiles en résolvant des affaires, puis échange-les.`);
    this.announcer.say(this.shopNudge());
  }

  openShop(): void { this.pause(); void this.router.navigate(['/boutique']); }

  /** Étoiles encore possibles au temps actuel, et prochain palier. */
  rated(): boolean { return !this.tutorial; }
  readonly liveStars = computed(() => starsFor(this.difficulty, this.game.elapsed()));
  readonly nextDrop = computed(() => {
    const t = STAR_TIMES[this.difficulty], n = this.liveStars();
    return n === 3 ? formatTime(t.three * 60000) : n === 2 ? formatTime(t.two * 60000) : '';
  });
  toggleStrike(i: number): void {
    const s = new Set(this.struck());
    if (s.has(i)) s.delete(i); else s.add(i);
    this.struck.set(s);
  }
  resetAll(): void {
    this.game.reset();
    this.recorded = null;
    this.result.set(null);
    this.struck.set(new Set());
    const c = this.game.currentCase();
    if (c) this.progress.clearSave(c.id);
  }
  /** Retour à l'écran d'origine : liste classique, sur mesure, ou règles (initiation). */
  goHome(): void {
    const c = this.game.currentCase();
    if (this.level) void this.nav.navigateBack(['/classique'], { queryParams: { d: this.level.difficulty } });
    else if (c?.share) void this.nav.navigateBack(['/sur-mesure']);
    else void this.nav.navigateBack(['/regles']);
  }
}
