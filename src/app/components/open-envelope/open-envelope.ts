import { ChangeDetectionStrategy, Component, output } from '@angular/core';

/**
 * Stage 2 — the opened envelope with the letter peeking out.
 * Emits `read` when the user taps / activates the letter.
 */
@Component({
  selector: 'app-open-envelope',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="stage">
      <button
        type="button"
        class="envelope"
        aria-label="Read the letter"
        (click)="read.emit()">
        <svg class="envelope__art" viewBox="0 0 520 470" role="img" aria-hidden="true">
          <defs>
            <linearGradient id="openBody" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#a01a2b" />
              <stop offset="100%" stop-color="#6b0011" />
            </linearGradient>
            <linearGradient id="openFlap" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#7d0c1e" />
              <stop offset="100%" stop-color="#520009" />
            </linearGradient>
            <linearGradient id="openPocket" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#b52233" />
              <stop offset="100%" stop-color="#7d0c1e" />
            </linearGradient>
          </defs>

          <!-- Heart balloons -->
          <g class="balloons">
            <path d="M300 40 q10 4 10 14 v40" fill="none" stroke="#d9b24a" stroke-width="1.5" />
            <path d="M360 30 q-8 6 -6 18 v52" fill="none" stroke="#d9b24a" stroke-width="1.5" />
            <path d="M312 12 c-8-12-26-8-26 6 0 10 12 18 26 30 14-12 26-20 26-30 0-14-18-18-26-6Z" fill="#c0392b" />
            <path d="M372 6 c-8-12-26-8-26 6 0 10 12 18 26 30 14-12 26-20 26-30 0-14-18-18-26-6Z" fill="#a5281e" />
          </g>

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
          <path d="M74 416 L260 214 L446 416" fill="none" stroke="#c23a4e" stroke-width="1.5" opacity="0.35" />
        </svg>
      </button>

      <p class="stage__hint">tap to open your invitation</p>
    </section>
  `,
  styleUrl: './open-envelope.scss',
})
export class OpenEnvelope {
  readonly read = output<void>();
}
