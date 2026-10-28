import { Injectable, inject } from '@angular/core';
import { SettingsService } from './settings.service';

/**
 * Annonces pour les lecteurs d'écran (TalkBack, VoiceOver) via des régions « live »
 * invisibles. Les annonces de jeu détaillées suivent le réglage « annonces » ;
 * les annonces essentielles (victoire) passent toujours.
 */
@Injectable({ providedIn: 'root' })
export class AnnouncerService {
  private settings = inject(SettingsService);
  private polite = this.region('polite');
  private assertive = this.region('assertive');

  private region(mode: 'polite' | 'assertive'): HTMLElement {
    const el = document.createElement('div');
    el.className = 'sr-only';
    el.setAttribute('aria-live', mode);
    el.setAttribute('aria-atomic', 'true');
    el.setAttribute('role', mode === 'assertive' ? 'alert' : 'status');
    document.body.appendChild(el);
    return el;
  }

  /** Annonce de jeu (respecte le réglage). */
  say(text: string): void {
    if (this.settings.settings().announce) this.push(this.polite, text);
  }

  /** Annonce importante, toujours faite. */
  alert(text: string): void { this.push(this.assertive, text); }

  private push(el: HTMLElement, text: string): void {
    // Vider puis remplir force la relecture d'un texte identique.
    el.textContent = '';
    setTimeout(() => (el.textContent = text), 60);
  }
}
