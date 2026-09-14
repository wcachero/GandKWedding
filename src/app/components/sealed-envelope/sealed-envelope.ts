import { ChangeDetectionStrategy, Component, output } from '@angular/core';

/**
 * Stage 1 — the sealed envelope.
 * A soft-blush envelope with a lighter seal and the GK monogram.
 * Emits `open` when the user taps / activates it.
 */
@Component({
  selector: 'app-sealed-envelope',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="stage">
      <p class="stage__hint">Tap the envelope to open</p>
      <button
        type="button"
        class="envelope"
        aria-label="Open the envelope"
        (click)="open.emit()">
        <svg class="envelope__art" viewBox="0 0 500 360" role="img" aria-hidden="true">
          <defs>
            <linearGradient id="sealedBody" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#f7e4dc" />
              <stop offset="52%" stop-color="#efd0c6" />
              <stop offset="100%" stop-color="#e3b8ac" />
            </linearGradient>
            <linearGradient id="sealedFlap" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#fbeee8" />
              <stop offset="100%" stop-color="#e8c4b8" />
            </linearGradient>
            <radialGradient id="sealFill" cx="38%" cy="30%" r="72%">
              <stop offset="0%" stop-color="#fff8f4" />
              <stop offset="55%" stop-color="#f7e4dc" />
              <stop offset="100%" stop-color="#efd0c6" />
            </radialGradient>
          </defs>

          <!-- Body -->
          <rect x="14" y="46" width="472" height="286" rx="16" fill="url(#sealedBody)" stroke="#e3a379" stroke-width="2" />
          <!-- Lower pocket fold lines -->
          <path d="M14 332 L250 200 L486 332" fill="none" stroke="#e3a379" stroke-width="2" opacity="0.85" />
          <!-- Closed flap -->
          <path d="M14 52 Q14 46 26 46 L474 46 Q486 46 486 52 L250 214 Z" fill="url(#sealedFlap)" stroke="#e3a379" stroke-width="1.5" />
          <path d="M14 52 L250 214 L486 52" fill="none" stroke="#e3a379" stroke-width="1.5" opacity="0.8" />

          <!-- Champagne seal with GK monogram -->
          <g transform="translate(250 208)">
            <circle r="58" fill="url(#sealFill)" stroke="#e3b8ac" stroke-width="2.2" />
            <circle r="51" fill="none" stroke="#efd0c6" stroke-width="1.4" opacity="0.9" />
            <image
              href="images/gk-monogram.png"
              x="-46"
              y="-30"
              width="92"
              height="60"
              preserveAspectRatio="xMidYMid meet" />
          </g>
        </svg>
      </button>
    </section>
  `,
  styleUrl: './sealed-envelope.scss',
})
export class SealedEnvelope {
  readonly open = output<void>();
}
