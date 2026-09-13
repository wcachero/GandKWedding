import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { SealedEnvelope } from '../sealed-envelope/sealed-envelope';
import { OpenEnvelope } from '../open-envelope/open-envelope';
import { WeddingInvitation } from '../wedding-invitation/wedding-invitation';
import { SiteFooter } from '../site-footer/site-footer';
import { MusicDisc } from '../music-disc/music-disc';
import { AudioService } from '../../services/audio';

/** The stages of the experience, in order of reveal. */
type Stage = 'sealed' | 'open' | 'reading';

const STAGE_ORDER: readonly Stage[] = ['sealed', 'open', 'reading'];

/**
 * Orchestrates the three-stage reveal:
 *   sealed envelope  →  open envelope  →  the wedding invitation.
 * Owns the stage state, starts the music on the first tap, swaps the
 * presentational child components, and exposes a back control.
 */
@Component({
  selector: 'app-letter-experience',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SealedEnvelope, OpenEnvelope, WeddingInvitation, SiteFooter, MusicDisc],
  template: `
    <div class="scene" [attr.data-stage]="stage()">
      @if (showBack()) {
        <button type="button" class="back" aria-label="Go back to the previous step" (click)="goBack()">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2"
                  stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span>Back</span>
        </button>
      }

      <div class="scene__content">
        @switch (stage()) {
          @case ('sealed') {
            <app-sealed-envelope (open)="openEnvelope()" />
          }
          @case ('open') {
            <app-open-envelope (read)="stage.set('reading')" />
          }
          @case ('reading') {
            <app-wedding-invitation />
          }
        }
      </div>

      @if (stage() !== 'sealed') {
        <div class="scene__music">
          <app-music-disc />
        </div>
      }

      @if (stage() === 'reading') {
        <app-site-footer class="scene__footer" (restart)="restart()" />

        <nav class="tabbar" aria-label="Quick navigation">
          <a class="tabbar__item" href="#top">
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
              <path fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"
                    stroke-linejoin="round" d="M3 10.5 12 3l9 7.5M5 9.5V20h5v-6h4v6h5V9.5"/>
            </svg>
            <span>Home</span>
          </a>
          <a class="tabbar__item" href="#rsvp">
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
              <path fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"
                    stroke-linejoin="round" d="M20.8 8.6a4.6 4.6 0 0 0-8.8-1.9 4.6 4.6 0 0 0-8.8 1.9c0 4.2 5.2 7.9 8.8 10 3.6-2.1 8.8-5.8 8.8-10Z"/>
            </svg>
            <span>RSVP</span>
          </a>
          <a class="tabbar__item" href="#gallery">
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
              <path fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"
                    stroke-linejoin="round" d="M4 5h16v14H4zM4 15l4.5-4.5L14 16M14 13l2.5-2.5L20 14M9.5 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/>
            </svg>
            <span>Gallery</span>
          </a>
        </nav>
      }
    </div>
  `,
  styleUrl: './letter-experience.scss',
})
export class LetterExperience {
  private readonly audio = inject(AudioService);
  protected readonly stage = signal<Stage>('sealed');

  /** The floating back control is only useful on the opened-envelope step. */
  protected readonly showBack = computed(() => this.stage() === 'open');

  /** Tapping the envelope opens it and starts the music (runs inside the user gesture). */
  protected openEnvelope(): void {
    this.stage.set('open');
    void this.audio.play();
  }

  protected goBack(): void {
    const index = STAGE_ORDER.indexOf(this.stage());
    if (index > 0) {
      this.stage.set(STAGE_ORDER[index - 1]);
    }
  }

  /** Return to the very beginning — the sealed envelope — and stop the music. */
  protected restart(): void {
    this.audio.pause();
    this.stage.set('sealed');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
}
