import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { GameState } from '../models/murdoku.models';

/**
 * Persistance de la progression via Capacitor Preferences
 * (localStorage sur le web, stockage natif sur iOS/Android).
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  private key(caseId: string): string {
    return `murdoku:save:${caseId}`;
  }

  private readonly solvedKey = 'murdoku:solved';

  async saveGame(state: GameState): Promise<void> {
    await Preferences.set({
      key: this.key(state.caseId),
      value: JSON.stringify(state),
    });
  }

  async loadGame(caseId: string): Promise<GameState | null> {
    const { value } = await Preferences.get({ key: this.key(caseId) });
    if (!value) return null;
    try {
      return JSON.parse(value) as GameState;
    } catch {
      return null;
    }
  }

  async clearGame(caseId: string): Promise<void> {
    await Preferences.remove({ key: this.key(caseId) });
  }

  async markSolved(caseId: string): Promise<void> {
    const solved = await this.getSolved();
    if (!solved.includes(caseId)) {
      solved.push(caseId);
      await Preferences.set({
        key: this.solvedKey,
        value: JSON.stringify(solved),
      });
    }
  }

  async getSolved(): Promise<string[]> {
    const { value } = await Preferences.get({ key: this.solvedKey });
    if (!value) return [];
    try {
      return JSON.parse(value) as string[];
    } catch {
      return [];
    }
  }
}
