import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  inject,
  output,
  signal,
} from '@angular/core';

/**
 * Stage 2 — the opened envelope with the letter peeking out.
 * Emits `read` when the user taps the letter, or automatically after 5s
 * with a “letter sliding out” animation.
 */
@Component({
  selector: 'app-open-envelope',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="stage">
      <button
        type="button"
        class="envelope"
        [class.envelope--reveal]="revealing()"
        aria-label="Read the letter"
        (click)="openNow()">
        <svg class="envelope__art" viewBox="70 50 380 372" role="img" aria-hidden="true">
          <defs>
            <linearGradient id="openBody" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#d4bc8a" />
              <stop offset="100%" stop-color="#9a7d45" />
            </linearGradient>
            <linearGradient id="openFlap" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#c3a46b" />
              <stop offset="100%" stop-color="#8a6e3a" />
            </linearGradient>
            <linearGradient id="openPocket" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#e7d8bc" />
              <stop offset="35%" stop-color="#d4bc8a" />
              <stop offset="100%" stop-color="#c3a46b" />
            </linearGradient>
          </defs>

          <!-- Open flap (behind the letter) -->
          <path d="M74 210 L260 54 L446 210 Z" fill="url(#openFlap)" />

          <!-- The letter, peeking out -->
          <g class="letter">
            <rect x="126" y="86" width="268" height="270" rx="6" fill="#f7f4ec"
                  stroke="#e6ddcd" stroke-width="1" />
            <text text-anchor="middle" font-family="'Great Vibes', cursive" fill="#5e4635">
              <tspan x="260" y="146" font-size="34">Gilfred &amp; Karylle</tspan>
              <tspan x="260" y="188" font-size="34">Wedding</tspan>
            </text>
          </g>

          <!-- Envelope body + front pocket (in front of the letter's lower half) -->
          <rect x="74" y="206" width="372" height="210" rx="14" fill="url(#openBody)" />
          <path d="M74 416 L260 214 L446 416 Z" fill="url(#openPocket)" />
          <path d="M74 416 L260 214 L446 416" fill="none" stroke="#e7d8bc" stroke-width="1.5" opacity="0.5" />
        </svg>
      </button>
    </section>
  `,
  styleUrl: './open-envelope.scss',
})
export class OpenEnvelope {
  private readonly destroyRef = inject(DestroyRef);

  readonly read = output<void>();
  protected readonly revealing = signal(false);

  private waitTimer: ReturnType<typeof setTimeout> | undefined;
  private revealTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    afterNextRender(() => {
      this.waitTimer = setTimeout(() => this.startReveal(), 3400);
    });

    this.destroyRef.onDestroy(() => this.clearTimers());
  }

  protected openNow(): void {
    this.clearTimers();
    this.read.emit();
  }

  private startReveal(): void {
    const reduce =
      typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      this.read.emit();
      return;
    }
    this.revealing.set(true);
    this.revealTimer = setTimeout(() => this.read.emit(), 1600);
  }

  private clearTimers(): void {
    clearTimeout(this.waitTimer);
    clearTimeout(this.revealTimer);
  }
}
