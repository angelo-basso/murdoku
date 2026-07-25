import { Injectable } from '@angular/core';
import {
  BOX_DIMS,
  BoardSize,
  BoxDims,
  Difficulty,
  Grid,
} from '../models/murdoku.models';

/**
 * Moteur Sudoku générique (tailles 4, 6, 9).
 * Génère une solution complète, puis creuse des cases en garantissant
 * l'unicité de la solution. Aucune dépendance à l'UI ni au thème "enquête".
 */
@Injectable({ providedIn: 'root' })
export class SudokuService {
  /** Proportion de cases conservées comme indices selon la difficulté. */
  private readonly cluesRatio: Record<Difficulty, number> = {
    facile: 0.58,
    moyen: 0.45,
    difficile: 0.34,
  };

  boxDims(size: BoardSize): BoxDims {
    return BOX_DIMS[size];
  }

  emptyGrid(size: number): Grid {
    return Array.from({ length: size }, () => new Array(size).fill(0));
  }

  cloneGrid(grid: Grid): Grid {
    return grid.map((row) => [...row]);
  }

  /**
   * Génère une partie : { solution, puzzle }.
   * `puzzle` contient les indices (0 = case vide à remplir).
   */
  generate(
    size: BoardSize,
    difficulty: Difficulty,
  ): { solution: Grid; puzzle: Grid } {
    const solution = this.generateSolution(size);
    const puzzle = this.dig(solution, size, difficulty);
    return { solution, puzzle };
  }

  /** Génère une grille pleine valide via backtracking randomisé. */
  private generateSolution(size: BoardSize): Grid {
    const grid = this.emptyGrid(size);
    this.fill(grid, size);
    return grid;
  }

  private fill(grid: Grid, size: number): boolean {
    const pos = this.firstEmpty(grid, size);
    if (!pos) return true; // grille pleine
    const [row, col] = pos;
    const candidates = this.shuffle(this.range(1, size));
    for (const value of candidates) {
      if (this.isSafe(grid, size, row, col, value)) {
        grid[row][col] = value;
        if (this.fill(grid, size)) return true;
        grid[row][col] = 0;
      }
    }
    return false;
  }

  /** Retire des cases tant que la solution reste unique. */
  private dig(solution: Grid, size: BoardSize, difficulty: Difficulty): Grid {
    const puzzle = this.cloneGrid(solution);
    const total = size * size;
    const targetClues = Math.max(
      size + 1,
      Math.round(total * this.cluesRatio[difficulty]),
    );

    const cells = this.shuffle(
      Array.from({ length: total }, (_, i) => i),
    );
    let clues = total;

    for (const index of cells) {
      if (clues <= targetClues) break;
      const row = Math.floor(index / size);
      const col = index % size;
      if (puzzle[row][col] === 0) continue;

      const backup = puzzle[row][col];
      puzzle[row][col] = 0;

      // Conserver l'unicité : si plusieurs solutions, on remet la valeur.
      if (this.countSolutions(puzzle, size, 2) !== 1) {
        puzzle[row][col] = backup;
      } else {
        clues--;
      }
    }
    return puzzle;
  }

  /** Compte les solutions jusqu'à `limit` (arrêt anticipé). */
  countSolutions(grid: Grid, size: number, limit: number): number {
    const work = this.cloneGrid(grid);
    let count = 0;

    const solve = (): boolean => {
      const pos = this.firstEmpty(work, size);
      if (!pos) {
        count++;
        return count >= limit; // stop dès qu'on atteint la limite
      }
      const [row, col] = pos;
      for (let value = 1; value <= size; value++) {
        if (this.isSafe(work, size, row, col, value)) {
          work[row][col] = value;
          if (solve()) {
            work[row][col] = 0;
            return true;
          }
          work[row][col] = 0;
        }
      }
      return false;
    };

    solve();
    return count;
  }

  /** Une valeur peut-elle être placée en (row, col) sans conflit ? */
  isSafe(
    grid: Grid,
    size: number,
    row: number,
    col: number,
    value: number,
  ): boolean {
    for (let i = 0; i < size; i++) {
      if (grid[row][i] === value) return false;
      if (grid[i][col] === value) return false;
    }
    const { rows, cols } = this.boxDims(size as BoardSize);
    const boxRow = Math.floor(row / rows) * rows;
    const boxCol = Math.floor(col / cols) * cols;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[boxRow + r][boxCol + c] === value) return false;
      }
    }
    return true;
  }

  /** Cases de la grille en conflit avec (row, col) — pour l'aide visuelle. */
  conflicts(grid: Grid, size: number, row: number, col: number): boolean {
    const value = grid[row][col];
    if (value === 0) return false;
    for (let i = 0; i < size; i++) {
      if (i !== col && grid[row][i] === value) return true;
      if (i !== row && grid[i][col] === value) return true;
    }
    const { rows, cols } = this.boxDims(size as BoardSize);
    const boxRow = Math.floor(row / rows) * rows;
    const boxCol = Math.floor(col / cols) * cols;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const rr = boxRow + r;
        const cc = boxCol + c;
        if ((rr !== row || cc !== col) && grid[rr][cc] === value) return true;
      }
    }
    return false;
  }

  isComplete(grid: Grid, size: number): boolean {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === 0) return false;
        if (this.conflicts(grid, size, r, c)) return false;
      }
    }
    return true;
  }

  private firstEmpty(grid: Grid, size: number): [number, number] | null {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === 0) return [r, c];
      }
    }
    return null;
  }

  private range(from: number, to: number): number[] {
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }

  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}
