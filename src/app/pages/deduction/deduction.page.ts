import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, bulbOutline, refreshOutline, listOutline, createOutline } from 'ionicons/icons';
import { findDeductionCase } from '../../core/data/deduction-cases';
import { DeductionGameService } from '../../core/services/deduction-game.service';
import { DeductionGeneratorService } from '../../core/services/deduction-generator.service';
import { DeductionSolverService } from '../../core/services/deduction-solver.service';

interface CellVm {
  r: number; col: number; room: string; roomName: string; firstOfRoom: boolean;
  tint: string; furn: string | null; blocked: boolean;
  occupant: string | null; occAvatar: string | null; occName: string | null;
  conflict: boolean; wallR: boolean; wallB: boolean; canPlace: boolean; elim: boolean;
}

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
          <ion-button (click)="goHome()"><ion-icon slot="icon-only" name="arrow-back"></ion-icon></ion-button>
        </ion-buttons>
        <ion-title>{{ game.currentCase()?.title }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="game.reset()"><ion-icon slot="icon-only" name="refresh-outline"></ion-icon></ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="ion-padding">
      @if (game.currentCase(); as c) {
        @if (share) {
          <div class="share">
            <span>Code&nbsp;: <code>{{ share }}</code></span>
            <button type="button" (click)="copyShare()">{{ copied ? 'copié ✓' : 'copier' }}</button>
          </div>
        }
        <!-- Plateau -->
        <div class="board" [style.--n]="c.n">
          @for (cell of cells(); track cell.r + '-' + cell.col) {
            <button type="button" class="cell"
              [class.blocked]="cell.blocked" [class.conflict]="cell.conflict"
              [class.wall-r]="cell.wallR" [class.wall-b]="cell.wallB" [class.place]="cell.canPlace"
              [attr.data-r]="cell.r" [attr.data-c]="cell.col"
              [style.background]="cell.tint" (click)="game.tapCell(cell.r, cell.col)">
              @if (cell.firstOfRoom) { <span class="room-label">{{ cell.roomName }}</span> }
              @if (cell.furn) { <img class="furn" [src]="cell.furn" alt="" draggable="false" /> }
              @if (cell.occAvatar) { <img class="token" [src]="cell.occAvatar" [alt]="cell.occName!" draggable="false" (pointerdown)="dragStart(cell.occupant!, $event)" /> }
              @if (cell.elim) { <span class="xmark">✕</span> }
            </button>
          }
        </div>

        <!-- Tray des personnes -->
        <div class="tray">
          @for (p of people(); track p.id) {
            <button type="button" class="person" [class.sel]="p.selected" [class.placed]="p.placed"
              [class.victim]="p.victim" (pointerdown)="dragStart(p.id, $event)" (click)="onPerson(p.id)">
              <img [src]="p.avatar" [alt]="p.name" draggable="false" />
              <span>{{ p.short }}</span>
            </button>
          }
        </div>

        <!-- Contrôles -->
        <div class="controls">
          <button type="button" class="ctrl" (click)="showClues = !showClues">
            <ion-icon name="list-outline"></ion-icon><span>Indices</span>
          </button>
          <button type="button" class="ctrl" [class.active]="game.notesMode()" (click)="game.toggleNotesMode()">
            <ion-icon name="create-outline"></ion-icon><span>Rature</span>
          </button>
          <button type="button" class="ctrl" (click)="game.hint()">
            <ion-icon name="bulb-outline"></ion-icon><span>Indice</span>
          </button>
        </div>
        @if (game.notesMode()) {
          <p class="notehint">Mode rature&nbsp;: choisis une personne, puis touche les cases où elle ne peut pas être (✕).</p>
        }

        @if (showClues) {
          <ol class="clues">
            @for (cl of c.clues; track $index) { <li>{{ cl.text }}</li> }
          </ol>
        }
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
            <div class="acts">
              <ion-button expand="block" (click)="goHome()">Autres affaires</ion-button>
              <ion-button expand="block" fill="outline" (click)="game.reset()">Rejouer</ion-button>
            </div>
          </div>
        </div>
      }
    </ion-content>
  `,
  styles: [`
    .share { display: flex; align-items: center; justify-content: center; gap: 8px;
      max-width: 420px; margin: 0 auto 8px; font-size: 12px; color: #9a8fc0; }
    .share code { color: var(--ion-color-primary); background: #0004; padding: 2px 6px; border-radius: 5px; }
    .share button { background: transparent; border: 1px solid rgba(212,175,55,0.4); color: var(--ion-color-primary);
      border-radius: 6px; padding: 2px 8px; font-size: 11px; }
    .board {
      display: grid;
      grid-template-columns: repeat(var(--n), minmax(0, 1fr));
      grid-template-rows: repeat(var(--n), minmax(0, 1fr));
      width: 100%; max-width: 420px; aspect-ratio: 1/1; margin: 0 auto 14px;
      background: #0d0a1c; border: 3px solid var(--ion-color-primary);
      border-radius: 8px; overflow: hidden; touch-action: none;
    }
    .cell {
      position: relative; padding: 0; margin: 0; border: 1px solid #0007;
      min-width: 0; min-height: 0; overflow: hidden;
      display: flex; align-items: center; justify-content: center; cursor: pointer;
    }
    .cell.wall-r { border-right: 3px solid var(--ion-color-primary); }
    .cell.wall-b { border-bottom: 3px solid var(--ion-color-primary); }
    .cell.blocked { cursor: default; }
    /* Cases bloquées : hachures nettes + mobilier grisé */
    .cell.blocked::after { content: ''; position: absolute; inset: 0; z-index: 2;
      background: repeating-linear-gradient(45deg, transparent 0 5px, rgba(0,0,0,0.42) 5px 7px), rgba(0,0,0,0.3); }
    .cell.blocked .furn { opacity: 0.5; filter: grayscale(0.5); }
    .cell.place:hover { box-shadow: inset 0 0 0 2px var(--ion-color-primary); }
    .cell.conflict .token { outline: 2px solid var(--ion-color-danger); border-radius: 4px; }
    .room-label {
      position: absolute; top: 1px; left: 2px; font-size: 6.5px; line-height: 1;
      color: var(--ion-color-primary); opacity: 0.85; z-index: 3; pointer-events: none;
      font-family: Georgia, serif;
    }
    .furn { position: absolute; width: 86%; height: 86%; object-fit: contain; opacity: 0.92; }
    .token { position: absolute; inset: 0; margin: auto; width: 80%; height: 80%;
      object-fit: contain; z-index: 2; touch-action: none; filter: drop-shadow(0 1px 2px #000a); }
    .tray {
      display: grid; grid-template-columns: repeat(6, 1fr); gap: 5px;
      max-width: 420px; margin: 0 auto 12px;
    }
    .person {
      display: flex; flex-direction: column; align-items: center; gap: 2px;
      padding: 5px 2px; border-radius: 9px; border: 1px solid rgba(212,175,55,0.3);
      background: var(--murdoku-cell-given-bg); color: var(--ion-text-color); cursor: pointer;
      touch-action: none;
    }
    .person img { width: 100%; max-width: 46px; object-fit: contain; }
    .person span { font-size: 8.5px; text-align: center; opacity: 0.85; }
    .person.sel { border-color: var(--ion-color-primary); background: var(--murdoku-cell-selected-bg); }
    .person.placed { opacity: 0.4; }
    .person.victim { border-color: var(--ion-color-danger); }
    .controls { display: flex; gap: 10px; justify-content: center; max-width: 420px; margin: 0 auto 10px; }
    .ctrl {
      flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px;
      border: 1px solid rgba(212,175,55,0.3); border-radius: 10px; background: transparent;
      color: var(--ion-text-color); font-size: 0.72rem;
    }
    .ctrl ion-icon { font-size: 1.3rem; }
    .clues { max-width: 420px; margin: 0 auto; padding-left: 20px; }
    .clues li { font-size: 13px; margin: 7px 0; color: #e8e2f6; }
    .reveal-overlay { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center;
      justify-content: center; background: rgba(10,7,20,0.85); padding: 24px; }
    .reveal-card { background: var(--ion-card-background); border: 2px solid var(--ion-color-primary);
      border-radius: 18px; padding: 24px; text-align: center; max-width: 340px; width: 100%; }
    .reveal-card .culprit { width: 120px; height: 120px; object-fit: contain; image-rendering: auto; }
    .reveal-card h2 { font-family: Georgia, serif; color: var(--ion-color-primary); margin: 6px 0; }
    .stamp { display: inline-block; border: 2px solid var(--ion-color-danger); color: var(--ion-color-danger);
      transform: rotate(-7deg); padding: 2px 10px; border-radius: 6px; font-weight: 700; letter-spacing: 2px;
      font-size: 0.7rem; margin-bottom: 10px; }
    .acts { display: flex; flex-direction: column; gap: 6px; margin-top: 14px; }
    .ctrl.active { background: var(--ion-color-primary); color: var(--ion-color-primary-contrast); }
    .xmark { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      color: var(--ion-color-danger); font-weight: 700; font-size: 1.1rem; pointer-events: none; opacity: 0.85; z-index: 3; }
    .notehint { max-width: 420px; margin: 0 auto 10px; font-size: 12px; color: #9a8fc0; text-align: center; }
    .drag-ghost { position: fixed; width: 54px; height: 60px; transform: translate(-50%, -60%);
      pointer-events: none; z-index: 60; filter: drop-shadow(0 4px 6px #000a); }
    .confetti { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
    .confetti span { position: absolute; top: -12px; width: 8px; height: 12px; border-radius: 2px;
      animation: fall 2.4s linear infinite; }
    @keyframes fall { 0% { transform: translateY(-20px) rotate(0); opacity: 1; }
      100% { transform: translateY(105vh) rotate(540deg); opacity: 0.9; } }
  `],
})
export class DeductionPage implements OnInit {
  game = inject(DeductionGameService);
  private solver = inject(DeductionSolverService);
  private gen = inject(DeductionGeneratorService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  showClues = true;
  copied = false;

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
    addIcons({ arrowBack, refreshOutline, bulbOutline, listOutline, createOutline });
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
    }
    // sinon : simple tap, géré par (click)
  }

  ngOnInit(): void {
    const code = this.route.snapshot.paramMap.get('code');
    if (code) {
      const opts = this.gen.parseCode(code);
      const c = opts ? this.gen.generate(opts) : null;
      if (!c) { this.router.navigate(['/home']); return; }
      this.game.start(c);
      return;
    }
    const id = this.route.snapshot.paramMap.get('caseId');
    const c = id ? findDeductionCase(id) : undefined;
    if (!c) { this.router.navigate(['/home']); return; }
    this.game.start(c);
  }

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

  readonly cells = computed<CellVm[]>(() => {
    const c = this.game.currentCase();
    if (!c) return [];
    const conflicts = this.game.conflicts();
    const sel = this.game.selected();
    const elimSet = this.game.eliminatedForSelected();
    const seen = new Set<string>();
    const out: CellVm[] = [];
    for (let r = 0; r < c.n; r++) {
      for (let col = 0; col < c.n; col++) {
        const room = c.rooms[r][col];
        const first = !seen.has(room); if (first) seen.add(room);
        const occ = this.game.occupantAt(r, col);
        const occPerson = occ ? c.people.find((p) => p.id === occ)! : null;
        const blocked = !this.solver.occupiable(c, r, col);
        out.push({
          r, col, room, roomName: c.roomNames[room], firstOfRoom: first,
          tint: c.tints?.[room] ?? TINT[room] ?? '#241c42', furn: this.furnPath(c.furniture[r][col]), blocked,
          occupant: occ, occAvatar: occ ? this.avatar(occ) : null, occName: occPerson?.name ?? null,
          conflict: !!occ && conflicts.has(occ),
          wallR: col < c.n - 1 && c.rooms[r][col] !== c.rooms[r][col + 1],
          wallB: r < c.n - 1 && c.rooms[r][col] !== c.rooms[r + 1][col],
          canPlace: !blocked && !!sel,
          elim: !!sel && !occ && elimSet.has(`${r},${col}`),
        });
      }
    }
    return out;
  });

  readonly people = computed(() => {
    const c = this.game.currentCase();
    if (!c) return [];
    const sel = this.game.selected();
    return c.people.map((p) => ({
      id: p.id, name: p.name, short: p.name.replace(/^(Le |La |L')/, ''),
      avatar: this.avatar(p.id), victim: !!p.victim,
      placed: this.game.isPlaced(p.id), selected: sel === p.id,
    }));
  });

  onPerson(id: string): void { this.game.selectPerson(id); }
  goHome(): void { this.router.navigate(['/home']); }
}
