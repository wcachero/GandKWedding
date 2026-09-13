import { ChangeDetectionStrategy, Component, output } from '@angular/core';

/**
 * Stage 1 — the sealed envelope.
 * A crimson envelope drawn as an SVG with a gold wax seal.
 * Emits `open` when the user taps / activates it.
 */
@Component({
  selector: 'app-sealed-envelope',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="stage">
      <h1 class="stage__title">You're Invited!</h1>

      <button
        type="button"
        class="envelope"
        aria-label="Open the envelope"
        (click)="open.emit()">
        <svg class="envelope__art" viewBox="0 0 500 360" role="img" aria-hidden="true">
          <defs>
            <linearGradient id="sealedBody" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#a01a2b" />
              <stop offset="100%" stop-color="#680010" />
            </linearGradient>
            <linearGradient id="sealedFlap" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#8f0f22" />
              <stop offset="100%" stop-color="#5c000e" />
            </linearGradient>
            <radialGradient id="wax" cx="38%" cy="32%" r="72%">
              <stop offset="0%" stop-color="#f0d488" />
              <stop offset="45%" stop-color="#d9b24a" />
              <stop offset="100%" stop-color="#a9812a" />
            </radialGradient>
          </defs>

          <!-- Body -->
          <rect x="14" y="46" width="472" height="286" rx="16" fill="url(#sealedBody)" />
          <!-- Lower pocket fold lines -->
          <path d="M14 332 L250 200 L486 332" fill="none" stroke="#4d000c" stroke-width="2" opacity="0.55" />
          <!-- Closed flap -->
          <path d="M14 52 Q14 46 26 46 L474 46 Q486 46 486 52 L250 214 Z" fill="url(#sealedFlap)" />
          <path d="M14 52 L250 214 L486 52" fill="none" stroke="#c23a4e" stroke-width="1.5" opacity="0.4" />

          <!-- Wax seal -->
          <g transform="translate(250 208)">
            <circle r="44" fill="url(#wax)" stroke="#8f6d1f" stroke-width="1.5" />
            <circle r="36" fill="none" stroke="#a9812a" stroke-width="2" opacity="0.7" />
            <!-- Bow motif -->
            <g fill="#9a7526" opacity="0.85">
              <path d="M-4 -2 L-22 -14 Q-28 -18 -24 -8 L-12 4 Z" />
              <path d="M4 -2 L22 -14 Q28 -18 24 -8 L12 4 Z" />
              <path d="M-3 2 L-14 18 Q-16 24 -8 18 L0 6 Z" />
              <path d="M3 2 L14 18 Q16 24 8 18 L0 6 Z" />
              <circle cx="0" cy="0" r="5" />
            </g>
          </g>
        </svg>
      </button>

      <p class="stage__hint">tap the envelope to open</p>
    </section>
  `,
  styleUrl: './sealed-envelope.scss',
})
export class SealedEnvelope {
  readonly open = output<void>();
}
