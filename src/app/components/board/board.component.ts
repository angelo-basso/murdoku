import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { BOX_DIMS, Suspect } from '../../core/models/murdoku.models';
import { MurdokuService } from '../../core/services/murdoku.service';

interface CellVm {
  row: number;
  col: number;
  value: number;
  emoji: string;
  avatar: string;
  given: boolean;
  selected: boolean;
  peer: boolean;
  same: boolean;
  error: boolean;
  culprit: boolean;
  boxRight: boolean;
  boxBottom: boolean;
  notes: number[];
}

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="board"
      [style.--size]="size()"
      role="grid"
      aria-label="Grille Murdoku"
    >
      @for (cell of cells(); track cell.row * size() + cell.col) {
        <button
          type="button"
          class="cell"
          role="gridcell"
          [class.given]="cell.given"
          [class.selected]="cell.selected"
          [class.peer]="cell.peer"
          [class.same]="cell.same"
          [class.error]="cell.error"
          [class.culprit]="cell.culprit"
          [class.box-right]="cell.boxRight"
          [class.box-bottom]="cell.boxBottom"
          (click)="onSelect(cell)"
        >
          @if (cell.value > 0) {
            <img class="glyph" [src]="cell.avatar" [alt]="cell.emoji" draggable="false" />
          } @else if (cell.notes.length) {
            <span class="notes">
              @for (n of cell.notes; track n) {
                <span class="note">{{ emojiOf(n) }}</span>
              }
            </span>
          }
          @if (cell.culprit) {
            <span class="loupe" aria-hidden="true">🔍</span>
          }
        </button>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
      .board {
        display: grid;
        grid-template-columns: repeat(var(--size), 1fr);
        aspect-ratio: 1 / 1;
        width: 100%;
        max-width: 460px;
        margin: 0 auto;
        background: var(--murdoku-grid-line);
        border: 3px solid var(--murdoku-box-line);
        border-radius: 10px;
        overflow: hidden;
        gap: 1px;
      }
      .cell {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        margin: 0;
        border: none;
        background: var(--murdoku-cell-bg);
        color: var(--ion-text-color);
        cursor: pointer;
        transition: background 0.12s ease;
        font-size: clamp(1rem, 6.5vw, 1.9rem);
        line-height: 1;
      }
      .cell.given {
        background: var(--murdoku-cell-given-bg);
      }
      .cell.peer {
        background: var(--murdoku-cell-peer-bg);
      }
      .cell.same {
        background: var(--murdoku-cell-same-bg);
      }
      .cell.selected {
        background: var(--murdoku-cell-selected-bg);
      }
      .cell.error .glyph {
        outline: 2px solid var(--murdoku-error);
        border-radius: 50%;
      }
      .cell.culprit {
        background: var(--murdoku-culprit-bg);
        box-shadow: inset 0 0 0 2px var(--murdoku-culprit-border);
      }
      .cell.box-right {
        border-right: 3px solid var(--murdoku-box-line);
      }
      .cell.box-bottom {
        border-bottom: 3px solid var(--murdoku-box-line);
      }
      .glyph {
        pointer-events: none;
        width: 82%;
        height: 82%;
        object-fit: contain;
        filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.4));
      }
      .loupe {
        position: absolute;
        top: 2px;
        right: 3px;
        font-size: 0.62rem;
        opacity: 0.75;
      }
      .notes {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0;
        width: 100%;
        height: 100%;
        padding: 2px;
        box-sizing: border-box;
      }
      .note {
        font-size: 0.55rem;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.8;
      }
    `,
  ],
})
export class BoardComponent {
  private murdoku = inject(MurdokuService);

  readonly size = computed(() => this.murdoku.state()?.size ?? 9);

  readonly cells = computed<CellVm[]>(() => {
    const s = this.murdoku.state();
    const c = this.murdoku.currentCase();
    if (!s || !c) return [];
    const sel = this.murdoku.selected();
    const box = BOX_DIMS[s.size];
    const suspects = new Map<number, Suspect>(
      c.suspects.map((x) => [x.id, x]),
    );
    const selValue = sel ? s.current[sel.row][sel.col] : 0;

    const out: CellVm[] = [];
    for (let row = 0; row < s.size; row++) {
      for (let col = 0; col < s.size; col++) {
        const value = s.current[row][col];
        const isSel = !!sel && sel.row === row && sel.col === col;
        const peer =
          !!sel &&
          !isSel &&
          (sel.row === row ||
            sel.col === col ||
            (Math.floor(sel.row / box.rows) === Math.floor(row / box.rows) &&
              Math.floor(sel.col / box.cols) === Math.floor(col / box.cols)));
        out.push({
          row,
          col,
          value,
          emoji: value > 0 ? suspects.get(value)?.emoji ?? '?' : '',
          avatar: value > 0 ? suspects.get(value)?.avatar ?? '' : '',
          given: s.given[row][col] !== 0,
          selected: isSel,
          peer,
          same: !isSel && value > 0 && value === selValue,
          error: this.murdoku.hasConflict(row, col),
          culprit:
            c.culpritCell.row === row && c.culpritCell.col === col,
          boxRight: (col + 1) % box.cols === 0 && col < s.size - 1,
          boxBottom: (row + 1) % box.rows === 0 && row < s.size - 1,
          notes: s.notes[row][col],
        });
      }
    }
    return out;
  });

  emojiOf(id: number): string {
    return this.murdoku.currentCase()?.suspects.find((x) => x.id === id)?.emoji ?? '';
  }

  onSelect(cell: CellVm): void {
    this.murdoku.select(cell.row, cell.col);
  }
}
