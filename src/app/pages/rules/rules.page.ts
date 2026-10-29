import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { AudioService } from '../../core/services/audio.service';

@Component({
  selector: 'app-rules',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/home" text="" aria-label="Retour au menu"></ion-back-button></ion-buttons>
        <ion-title>Comment jouer</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding mk-page">
      <div class="mk-wrap">
        <section class="mk-card rules">
          <h2>Les règles</h2>
          <ol>
            <li><span class="n" aria-hidden="true">1</span><p>Une seule personne par <b>ligne</b>, par <b>colonne</b> et par <b>pièce</b>.</p></li>
            <li><span class="n" aria-hidden="true">2</span><p>On se place sur un siège, un lit ou le sol, jamais sur un meuble <b>hachuré</b>.</p></li>
            <li><span class="n" aria-hidden="true">3</span><p>Tous les <b>indices</b> doivent être respectés. « À côté » ne traverse pas les murs.</p></li>
            <li><span class="n" aria-hidden="true">4</span><p>Seule exception : le <b>coupable</b>, l'unique personne qui partage la pièce de la victime.</p></li>
          </ol>
          <button type="button" class="mk-primary" (click)="router.navigate(['/deduction', 'manoir-6'])">Faire l'affaire d'initiation</button>
        </section>

        <section class="mk-card rules">
          <h2>Progression et étoiles</h2>
          <ul>
            <li><p>Chaque affaire s'ouvre quand la précédente est résolue.</p></li>
            <li><p>Une difficulté s'ouvre après <b>5 affaires</b> résolues dans la précédente.</p></li>
            <li><p>Selon ta rapidité, une affaire rapporte de 1 à <b>3 étoiles</b>.</p></li>
            <li><p>Chaque enquête coûte <b>1 ⚡ énergie</b>. Elle se recharge seule jusqu'à 5 (1 toutes les 10 minutes), et des victoires en offrent parfois.</p></li>
            <li><p>Tu commences avec <b>3 indices</b>. La boutique échange tes étoiles contre des indices, des loupes et des cadres.</p></li>
            <li><p>Termine les 20 affaires d'une difficulté pour ouvrir les <b>affaires sur mesure</b>.</p></li>
          </ul>
        </section>

        <section class="mk-card rules">
          <h2>Les gestes</h2>
          <ul>
            <li><p>Touche un personnage puis une case dorée pour le poser, ou fais-le glisser.</p></li>
            <li><p>Touche un personnage posé pour le déplacer ; « Retirer » ou un glisser hors du plateau le renvoie dans la réserve.</p></li>
            <li><p><b>Rature</b> : marque les cases où une personne ne peut pas être.</p></li>
            <li><p>Les cases barrées en gris sont exclues d'office (ligne, colonne ou pièce déjà prise).</p></li>
          </ul>
        </section>
      </div>
    </ion-content>
  `,
  styles: [`
    .rules ol, .rules ul { list-style: none; margin: 0 0 6px; padding: 0; }
    .rules li { display: flex; gap: 10px; align-items: flex-start; margin: 0 0 9px; font-size: .9rem; line-height: 1.45; color: var(--mk-text-soft); }
    .rules ul li::before { content: '•'; color: var(--ion-color-primary); }
    .rules li p { margin: 0; }
    .rules .n { flex: 0 0 22px; height: 22px; border-radius: 50%; display: grid; place-items: center;
      background: #d4af3722; color: var(--ion-color-primary); font-size: .75rem; font-weight: 700; }
    .rules b { color: var(--ion-text-color); }
  `],
})
export class RulesPage {
  readonly router = inject(Router);
  private audio = inject(AudioService);
  ionViewDidEnter(): void { this.audio.playMusic('menu'); }
}
