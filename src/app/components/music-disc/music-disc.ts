import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AudioService } from '../../services/audio';

/**
 * A vinyl record that controls the shared background music.
 * Tapping toggles playback; the disc spins only while the audio is playing.
 */
@Component({
  selector: 'app-music-disc',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="player">
      <button
        type="button"
        class="player__disc"
        [class.player__disc--spinning]="audio.playing()"
        [attr.aria-pressed]="audio.playing()"
        [attr.aria-label]="audio.playing() ? 'Pause music' : 'Play music'"
        (click)="audio.toggle()">
        <img src="images/vinyl-disc.png" alt="" width="88" height="88" />
      </button>

      <p class="player__label">{{ audio.playing() ? 'Now playing…' : 'Tap to play music' }}</p>
    </div>
  `,
  styleUrl: './music-disc.scss',
})
export class MusicDisc {
  protected readonly audio = inject(AudioService);
}
