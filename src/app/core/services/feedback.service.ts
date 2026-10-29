import { Injectable, inject } from '@angular/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { AudioService, Sfx } from './audio.service';
import { SettingsService } from './settings.service';

/** Retours au joueur : son + vibration, selon les réglages. */
@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private audio = inject(AudioService);
  private settings = inject(SettingsService);

  emit(kind: Sfx): void {
    this.audio.play(kind);
    const s = this.settings.settings();
    if (!s.haptics) return;
    try {
      if (kind === 'win') void Haptics.notification({ type: NotificationType.Success });
      else if (kind === 'error') { if (s.hapticError) void Haptics.notification({ type: NotificationType.Error }); }
      else if (kind === 'place') void Haptics.impact({ style: ImpactStyle.Light });
      else if (kind === 'remove') void Haptics.impact({ style: ImpactStyle.Medium });
    } catch { /* web sans vibration : ignoré */ }
  }
}
