import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import QRCode from 'qrcode';
import { WEDDING, WeddingEvent } from '../../data/wedding';
import { Reveal } from '../../directives/reveal';
import { Parallax } from '../../directives/parallax';

interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  passed: boolean;
}

interface EventView extends WeddingEvent {
  readonly mapEmbed: SafeResourceUrl;
  readonly mapLink: string;
}

/**
 * The full-width wedding invitation shown after the envelope is opened.
 * Presentational content comes from the WEDDING data model; this class drives
 * the live countdown, the map URLs and the photo lightbox.
 */
@Component({
  selector: 'app-wedding-invitation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Reveal, Parallax],
  templateUrl: './wedding-invitation.html',
  styleUrl: './wedding-invitation.scss',
})
export class WeddingInvitation {
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly wedding = WEDDING;

  protected readonly ceremony = this.toEventView(WEDDING.ceremony);
  protected readonly reception = this.toEventView(WEDDING.reception);

  /** Inline embed of the Google Script RSVP page. */
  protected readonly rsvpEmbed: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
    WEDDING.rsvp.url,
  );

  /** Current time, ticked every second to drive the countdown. */
  private readonly now = signal(Date.now());

  protected readonly countdown = computed<Countdown>(() => {
    const diff = new Date(this.wedding.dateIso).getTime() - this.now();
    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, passed: true };
    }
    const s = Math.floor(diff / 1000);
    return {
      days: Math.floor(s / 86400),
      hours: Math.floor((s % 86400) / 3600),
      minutes: Math.floor((s % 3600) / 60),
      seconds: s % 60,
      passed: false,
    };
  });

  /** Mobile nav (hamburger) open state. */
  protected readonly menuOpen = signal(false);

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  /** Short monogram (no spaces) shown in the centre of the QR code. */
  protected readonly qrBadge = WEDDING.monogram.replace(/\s+/g, '');

  /** Public URL of this invitation, resolved in the browser. */
  protected readonly shareUrl = signal('');

  /** Data-URL of the generated QR code (null until rendered in the browser). */
  protected readonly qrDataUrl = signal<string | null>(null);

  /** Whether the enlarged QR modal is open. */
  protected readonly qrOpen = signal(false);

  /** Rolling hint under the Share tile ("Tap to share" → "Link copied!"). */
  protected readonly shareHint = signal('Tap to share');

  /** Venue map currently open in the modal, or null when closed. */
  protected readonly activeMap = signal<{
    name: string;
    embed: SafeResourceUrl;
    link: string;
  } | null>(null);

  /** Photo currently open in the lightbox, or null when closed. */
  protected readonly lightboxPhoto = signal<string | null>(null);

  /** Venue photos that failed to load, so their <img> can be hidden. */
  protected readonly failedPhotos = signal<ReadonlySet<string>>(new Set());

  protected onPhotoError(photo: string): void {
    this.failedPhotos.update((set) => new Set(set).add(photo));
  }

  constructor() {
    const id = setInterval(() => this.now.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(id));

    // Resolve the live URL and render the QR code only in the browser
    // (window is unavailable during prerendering).
    afterNextRender(() => {
      const url = `${window.location.origin}/`;
      this.shareUrl.set(url);
      QRCode.toDataURL(url, {
        errorCorrectionLevel: 'H', // high recovery so the centre badge is safe
        margin: 1,
        width: 640,
        color: { dark: '#6b3b2e', light: '#ffffff' },
      })
        .then((data) => this.qrDataUrl.set(data))
        .catch(() => this.qrDataUrl.set(null));
    });
  }

  protected openQr(): void {
    this.qrOpen.set(true);
  }

  protected closeQr(): void {
    this.qrOpen.set(false);
  }

  /** Share via the native share sheet (mobile), falling back to clipboard copy. */
  protected async shareSite(): Promise<void> {
    const url = this.shareUrl() || window.location.href;
    const shareData = {
      title: `${this.wedding.groom} & ${this.wedding.bride} — Wedding Invitation`,
      text: "You're invited! Join us as we celebrate our wedding.",
      url,
    };
    const nav = window.navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
    };
    try {
      if (nav.share) {
        await nav.share(shareData);
        this.shareHint.set('Thanks for sharing!');
      } else {
        await navigator.clipboard.writeText(url);
        this.shareHint.set('Link copied!');
      }
    } catch {
      // User dismissed the share sheet, or clipboard was blocked — ignore.
    }
  }

  private toEventView(event: WeddingEvent): EventView {
    const q = encodeURIComponent(event.mapQuery);
    return {
      ...event,
      mapEmbed: this.sanitizer.bypassSecurityTrustResourceUrl(
        `https://www.google.com/maps?q=${q}&output=embed`,
      ),
      mapLink: `https://www.google.com/maps/search/?api=1&query=${q}`,
    };
  }

  protected openMap(event: EventView): void {
    this.activeMap.set({ name: event.venue, embed: event.mapEmbed, link: event.mapLink });
  }

  protected closeMap(): void {
    this.activeMap.set(null);
  }

  protected openLightbox(photo: string): void {
    this.lightboxPhoto.set(photo);
  }

  protected closeLightbox(): void {
    this.lightboxPhoto.set(null);
  }

  protected pad(n: number): string {
    return n.toString().padStart(2, '0');
  }

  /** Whether the "Add to Calendar" chooser is open. */
  protected readonly calOpen = signal(false);

  protected openCal(): void {
    this.calOpen.set(true);
  }

  protected closeCal(): void {
    this.calOpen.set(false);
  }

  /**
   * Google Calendar "add event" link. A plain https navigation, so it works
   * inside in-app browsers (Messenger, Instagram) where file downloads do not.
   */
  protected readonly googleCalUrl = (() => {
    const start = new Date(WEDDING.dateIso);
    const end = new Date(start.getTime() + 5 * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `${WEDDING.groom} & ${WEDDING.bride} Wedding`,
      dates: `${fmt(start)}/${fmt(end)}`,
      details: `Join us as we celebrate the wedding of ${WEDDING.groom} & ${WEDDING.bride}. Ceremony at ${WEDDING.ceremony.venue}.`,
      location: WEDDING.ceremony.address,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  })();
}
