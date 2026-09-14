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
  private readonly destroyRef = inject(DestroyRef);
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

  /** True while the guest is scrolling down — bar slides away until idle or scroll-up. */
  protected readonly navHidden = signal(false);

  /** Gallery carousel index and whether the full album is expanded. */
  protected readonly galleryIndex = signal(0);
  protected readonly galleryExpanded = signal(false);
  private readonly galleryWindow = 3;

  protected readonly gallerySlides = computed(() => {
    const all = this.wedding.gallery;
    if (this.galleryExpanded()) {
      return all;
    }
    const n = all.length;
    const start = ((this.galleryIndex() % n) + n) % n;
    return Array.from({ length: Math.min(this.galleryWindow, n) }, (_, i) => all[(start + i) % n]);
  });

  protected readonly galleryHasMore = computed(
    () => !this.galleryExpanded() && this.wedding.gallery.length > this.galleryWindow,
  );

  protected galleryPrev(): void {
    const n = this.wedding.gallery.length;
    this.galleryIndex.update((i) => (i - 1 + n) % n);
  }

  protected galleryNext(): void {
    const n = this.wedding.gallery.length;
    this.galleryIndex.update((i) => (i + 1) % n);
  }

  protected expandGallery(): void {
    this.galleryExpanded.set(true);
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => {
      if (!open) {
        this.navHidden.set(false);
      }
      return !open;
    });
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

  /** Whether the share chooser is open, and whether the link was just copied. */
  protected readonly shareOpen = signal(false);
  protected readonly copied = signal(false);
  /** True when the browser exposes the native share sheet. */
  protected readonly canNativeShare = signal(false);

  /** Social share links, built from the resolved page URL. */
  protected readonly fbShareUrl = computed(
    () => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(this.shareUrl())}`,
  );
  protected readonly waShareUrl = computed(
    () => `https://wa.me/?text=${encodeURIComponent("You're invited! " + this.shareUrl())}`,
  );

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
    this.destroyRef.onDestroy(() => clearInterval(id));

    // Resolve the live URL and render the QR code only in the browser
    // (window is unavailable during prerendering).
    afterNextRender(() => {
      this.setupAutoHideNav();

      const url = `${window.location.origin}/`;
      this.shareUrl.set(url);
      this.canNativeShare.set(typeof navigator !== 'undefined' && !!navigator.share);
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

  protected openShare(): void {
    this.copied.set(false);
    this.shareOpen.set(true);
  }

  protected closeShare(): void {
    this.shareOpen.set(false);
  }

  /** Close the chooser after the browser has followed the share link. */
  protected pickShare(): void {
    setTimeout(() => this.shareOpen.set(false), 600);
  }

  /** Copy the invitation link and reflect it in the chooser. */
  protected async copyShareLink(): Promise<void> {
    const ok = await this.copyLink(this.shareUrl() || window.location.href);
    this.copied.set(ok);
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
      canShare?: (data: ShareData) => boolean;
    };

    // 1) Native share sheet, when available and willing to accept the data.
    if (nav.share && (!nav.canShare || nav.canShare(shareData))) {
      try {
        await nav.share(shareData);
        this.shareHint.set('Thanks for sharing!');
        return;
      } catch (err) {
        // User cancelled — stop quietly. Any other error → fall back to copy.
        if ((err as Error)?.name === 'AbortError') return;
      }
    }

    // 2) Copy the link (async clipboard, then legacy execCommand as a fallback).
    const copied = await this.copyLink(url);
    this.shareHint.set(copied ? 'Link copied!' : url);
  }

  /** Copy text to the clipboard, with a legacy fallback for older webviews. */
  private async copyLink(text: string): Promise<boolean> {
    try {
      if (window.isSecureContext && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // fall through to the legacy path
    }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, text.length);
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }

  /**
   * Hide the sticky bar while scrolling down, reveal it on scroll-up,
   * and always bring it back after 5s without further scroll.
   */
  private setupAutoHideNav(): void {
    const IDLE_MS = 5000;
    const DELTA = 8;
    let lastY = window.scrollY;
    let idleId: ReturnType<typeof setTimeout> | null = null;

    const showNav = () => this.navHidden.set(false);

    const onScroll = () => {
      const y = Math.max(0, window.scrollY);
      const delta = y - lastY;
      lastY = y;

      if (idleId !== null) {
        clearTimeout(idleId);
      }
      idleId = setTimeout(showNav, IDLE_MS);

      if (this.menuOpen()) {
        showNav();
        return;
      }

      if (y < 12) {
        showNav();
        return;
      }

      if (delta > DELTA) {
        this.navHidden.set(true);
      } else if (delta < -DELTA) {
        showNav();
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('scroll', onScroll);
      if (idleId !== null) {
        clearTimeout(idleId);
      }
    });
  }

  private toEventView(event: WeddingEvent): EventView {
    const q = encodeURIComponent(event.mapQuery);
    return {
      ...event,
      mapEmbed: this.sanitizer.bypassSecurityTrustResourceUrl(
        `https://maps.google.com/maps?q=${q}&z=15&hl=en&t=&ie=UTF8&iwloc=B&output=embed`,
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
   * Close the chooser *after* the browser has followed the calendar link.
   * Closing synchronously removes the <a> from the DOM and cancels navigation.
   */
  protected pickCal(): void {
    setTimeout(() => this.calOpen.set(false), 600);
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
