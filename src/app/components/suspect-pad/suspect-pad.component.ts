import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { MurdokuService } from '../../core/services/murdoku.service';

@Component({
  selector: 'app-suspect-pad',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pad" [style.--cols]="cols()">
      @for (s of suspects(); track s.id) {
        <button
          type="button"
          class="key"
          [class.done]="counts()[s.id] >= size()"
          (click)="onPick(s.id)"
        >
          <span class="emoji">{{ s.emoji }}</span>
          <span class="name">{{ s.name }}</span>
        </button>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        max-width: 460px;
        margin: 0 auto;
      }
      .pad {
        display: grid;
        grid-template-columns: repeat(var(--cols), 1fr);
        gap: 6px;
      }
      .key {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        padding: 8px 4px;
        border: 1px solid rgba(212, 175, 55, 0.35);
        border-radius: 10px;
        background: var(--murdoku-cell-given-bg);
        color: var(--ion-text-color);
        cursor: pointer;
        min-height: 58px;
      }
      .key:active {
        background: var(--murdoku-cell-selected-bg);
      }
      .key.done {
        opacity: 0.4;
      }
      .emoji {
        font-size: 1.5rem;
        line-height: 1;
      }
      .name {
        font-size: 0.6rem;
        text-align: center;
        opacity: 0.85;
      }
    `,
  ],
})
export class SuspectPadComponent {
  private murdoku = inject(MurdokuService);

  readonly suspects = computed(
    () => this.murdoku.currentCase()?.suspects ?? [],
  );
  readonly counts = this.murdoku.counts;
  readonly size = computed(() => this.murdoku.state()?.size ?? 9);
  readonly cols = computed(() => {
    const n = this.size();
    if (n <= 4) return 4;
    if (n <= 6) return 3;
    return 3;
  });

  onPick(id: number): void {
    this.murdoku.input(id);
  }
}
