import { Component, inject, signal } from '@angular/core';
import { AlertController, IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { AnnouncerService } from '../../core/services/announcer.service';
import { AudioService } from '../../core/services/audio.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { ProgressService, SHOP, ShopItem } from '../../core/services/progress.service';

/** Boutique : échange des étoiles contre des indices, des loupes et des cadres. */
@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/home" text="" aria-label="Retour"></ion-back-button></ion-buttons>
        <ion-title>Boutique</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding mk-page">
      <div class="mk-wrap">
        <section class="wallet" aria-label="Porte-monnaie">
          <p class="bal"><span aria-hidden="true">★</span> {{ progress.balance() }} <small>étoile{{ progress.balance() > 1 ? 's' : '' }}</small></p>
          <p class="inv">💡 {{ progress.inventory().hints }} indice{{ progress.inventory().hints > 1 ? 's' : '' }}
            · 🔍 {{ progress.inventory().loupes }} loupe{{ progress.inventory().loupes > 1 ? 's' : '' }}</p>
          <p class="mk-muted">Chaque affaire rapporte jusqu'à 3 étoiles selon ta rapidité. Rejouer une affaire plus vite rapporte la différence.</p>
        </section>

        <section class="mk-card">
          <h2>Aides</h2>
          @for (it of aids; track it.id) {
            <div class="item">
              <span class="ico" aria-hidden="true">{{ it.kind === 'hints' ? '💡' : '🔍' }}</span>
              <span class="txt"><b>{{ it.name }}</b><small>{{ it.desc }}</small></span>
              <button type="button" class="buy" [disabled]="progress.balance() < it.price" (click)="buy(it)"
                [attr.aria-label]="'Acheter ' + it.name + ' pour ' + it.price + ' étoiles'">{{ it.price }} ★</button>
            </div>
          }
        </section>

        <section class="mk-card">
          <h2>Cadres de plateau</h2>
          <div class="frames">
            @for (it of frames; track it.id) {
              <button type="button" class="frame" [class.on]="progress.frame() === it.id" (click)="buy(it)"
                [disabled]="!owned(it.id) && progress.balance() < it.price"
                [attr.aria-pressed]="progress.frame() === it.id"
                [attr.aria-label]="it.name + (owned(it.id) ? (progress.frame() === it.id ? ', équipé' : ', possédé : toucher pour équiper') : ', ' + it.price + ' étoiles')">
                <span class="swatch" [style.border-color]="it.color" aria-hidden="true"></span>
                <b>{{ it.name }}</b>
                <small>{{ progress.frame() === it.id ? 'Équipé' : owned(it.id) ? 'Équiper' : it.price + ' ★' }}</small>
              </button>
            }
          </div>
        </section>
        @if (msg()) { <p class="msg" role="status">{{ msg() }}</p> }
      </div>
    </ion-content>
  `,
  styles: [`
    .wallet { text-align: center; margin: 4px 0 14px; }
    .bal { margin: 0; font: 700 2rem Georgia, serif; color: var(--mk-gold-text); }
    .bal small { font: 400 .9rem system-ui, sans-serif; color: var(--mk-muted); }
    .inv { margin: 4px 0 0; color: var(--mk-text-soft); font-size: .95rem; }
    .item { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-top: 1px solid var(--mk-fill); }
    .item:first-of-type { border-top: none; }
    .ico { font-size: 1.5rem; }
    .txt { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .txt small { color: var(--mk-muted); font-size: .78rem; line-height: 1.3; }
    .buy { min-width: 66px; min-height: 42px; border-radius: 11px; border: none; background: var(--ion-color-primary);
      color: var(--ion-color-primary-contrast); font-weight: 700; }
    .buy:disabled { opacity: .35; }
    .frames { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; }
    .frame { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 6px; border-radius: 12px;
      border: 1px solid var(--mk-border); background: var(--mk-fill); color: var(--ion-text-color); font-size: .8rem; }
    .frame.on { border-color: var(--ion-color-primary); background: #d4af3718; }
    .frame:disabled { opacity: .4; }
    .frame small { color: var(--mk-muted); }
    .swatch { width: 44px; height: 44px; border-radius: 6px; border: 4px solid; background: var(--mk-surface-2); }
    .msg { text-align: center; color: var(--mk-success-text); font-weight: 600; }
  `],
})
export class ShopPage {
  readonly progress = inject(ProgressService);
  private feedback = inject(FeedbackService);
  private announcer = inject(AnnouncerService);
  private audio = inject(AudioService);
  private alerts = inject(AlertController);
  readonly aids = SHOP.filter((s) => s.kind !== 'frame');
  readonly frames = SHOP.filter((s) => s.kind === 'frame');
  readonly msg = signal('');

  async ionViewWillEnter(): Promise<void> { await this.progress.load(); }
  ionViewDidEnter(): void { this.audio.playMusic('menu'); }

  owned(id: string): boolean { return this.progress.frames().includes(id); }

  /** Demande confirmation avant de dépenser des étoiles (équiper un cadre possédé est immédiat). */
  async buy(it: ShopItem): Promise<void> {
    const wasOwned = it.kind === 'frame' && this.owned(it.id);
    if (!wasOwned && it.price > 0) {
      if (this.progress.balance() < it.price) { this.feedback.emit('error'); this.msg.set('Pas assez d\'étoiles.'); return; }
      const after = this.progress.balance() - it.price;
      const alert = await this.alerts.create({
        header: 'Confirmer l\'achat',
        message: `${it.name} pour ${it.price} étoile${it.price > 1 ? 's' : ''} ? Il te restera ${after} étoile${after > 1 ? 's' : ''}.`,
        buttons: [{ text: 'Annuler', role: 'cancel' }, { text: 'Acheter', role: 'confirm' }],
      });
      await alert.present();
      const { role } = await alert.onDidDismiss();
      if (role !== 'confirm') { this.msg.set('Achat annulé.'); return; }
    }
    if (!this.progress.buy(it)) { this.feedback.emit('error'); this.msg.set('Pas assez d\'étoiles.'); return; }
    this.feedback.emit('hint');
    this.msg.set(wasOwned ? `${it.name} équipé.` : `${it.name} : acheté ! Solde : ${this.progress.balance()} étoiles.`);
    this.announcer.say(this.msg());
  }
}
