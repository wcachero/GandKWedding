import { ChangeDetectionStrategy, Component, output } from '@angular/core';

/**
 * Stage 1 — the sealed envelope.
 * A peach envelope with a champagne seal and the GK monogram.
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
              <stop offset="0%" stop-color="#e3a379" />
              <stop offset="52%" stop-color="#cf8f6b" />
              <stop offset="100%" stop-color="#b3714c" />
            </linearGradient>
            <linearGradient id="sealedFlap" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#d59a74" />
              <stop offset="100%" stop-color="#9f6242" />
            </linearGradient>
            <radialGradient id="sealFill" cx="38%" cy="30%" r="72%">
              <stop offset="0%" stop-color="#fff8ef" />
              <stop offset="55%" stop-color="#f4e6cf" />
              <stop offset="100%" stop-color="#e7d8bc" />
            </radialGradient>
          </defs>

          <!-- Body -->
          <rect x="14" y="46" width="472" height="286" rx="16" fill="url(#sealedBody)" />
          <!-- Lower pocket fold lines -->
          <path d="M14 332 L250 200 L486 332" fill="none" stroke="#8a4f32" stroke-width="2" opacity="0.45" />
          <!-- Closed flap -->
          <path d="M14 52 Q14 46 26 46 L474 46 Q486 46 486 52 L250 214 Z" fill="url(#sealedFlap)" />
          <path d="M14 52 L250 214 L486 52" fill="none" stroke="#f0d4bc" stroke-width="1.5" opacity="0.45" />

          <!-- Champagne seal with GK monogram -->
          <g transform="translate(250 208)">
            <circle r="58" fill="url(#sealFill)" stroke="#c3a46b" stroke-width="2.2" />
            <circle r="51" fill="none" stroke="#c6a982" stroke-width="1.4" opacity="0.85" />
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
