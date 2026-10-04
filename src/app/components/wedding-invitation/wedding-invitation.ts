import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  Injector,
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
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);
  protected readonly wedding = WEDDING;

  /** Same mark as `.nav__logo`, burned into the centre of the QR at a scan-safe size. */
  private static readonly QR_LOGO = 'images/gk-nav-logo.png';

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

  /** Whether the full metro tile album is expanded. */
  protected readonly galleryExpanded = signal(false);
  private readonly galleryPreviewCount = 8;

  protected readonly gallerySlides = computed(() => {
    const all = this.wedding.gallery;
    if (this.galleryExpanded()) {
      return all;
    }
    return all.slice(0, this.galleryPreviewCount);
  });

  protected readonly galleryHasMore = computed(
    () => !this.galleryExpanded() && this.wedding.gallery.length > this.galleryPreviewCount,
  );

  protected readonly galleryCanCollapse = computed(() => this.galleryExpanded());

  /** Per-photo object-position, filled when faces can be detected. */
  private readonly galleryFocus = signal<ReadonlyMap<string, string>>(new Map());

  /** Photos whose tile image has finished loading (or failed). */
  private readonly galleryLoaded = signal<ReadonlySet<string>>(new Set());

  protected galleryImageReady(photo: string): boolean {
    return this.galleryLoaded().has(photo);
  }

  protected galleryObjectPosition(photo: string): string {
    return this.galleryFocus().get(photo) ?? 'center 22%';
  }

  protected onGalleryImageLoad(photo: string, event: Event): void {
    this.markGalleryLoaded(photo);
    void this.focusGalleryPerson(photo, event.target as HTMLImageElement);
  }

  protected onGalleryImageError(photo: string): void {
    this.markGalleryLoaded(photo);
  }

  private markGalleryLoaded(photo: string): void {
    if (this.galleryLoaded().has(photo)) {
      return;
    }
    this.galleryLoaded.update((set) => new Set(set).add(photo));
  }

  /** Mark tiles already in browser cache so skeletons clear immediately. */
  private hydrateGalleryImageStates(): void {
    const imgs = this.host.nativeElement.querySelectorAll(
      '.gallery__tile img',
    ) as NodeListOf<HTMLImageElement>;
    imgs.forEach((img) => {
      if (!img.complete || img.naturalWidth <= 0) {
        return;
      }
      const photo = img.getAttribute('src');
      if (photo) {
        this.markGalleryLoaded(photo);
      }
    });
  }

  private async focusGalleryPerson(photo: string, img: HTMLImageElement): Promise<void> {
    if (this.galleryFocus().has(photo)) {
      return;
    }
    const FaceDetectorCtor = (
      window as Window & {
        FaceDetector?: new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => {
          detect(image: HTMLImageElement): Promise<readonly { boundingBox: DOMRectReadOnly }[]>;
        };
      }
    ).FaceDetector;
    if (!FaceDetectorCtor) {
      return;
    }
    try {
      const detector = new FaceDetectorCtor({ fastMode: true, maxDetectedFaces: 4 });
      const faces = await detector.detect(img);
      if (!faces.length || !img.naturalWidth || !img.naturalHeight) {
        return;
      }

      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;
      for (const face of faces) {
        const box = face.boundingBox;
        minX = Math.min(minX, box.x);
        minY = Math.min(minY, box.y);
        maxX = Math.max(maxX, box.x + box.width);
        maxY = Math.max(maxY, box.y + box.height);
      }

      const cx = (((minX + maxX) / 2) / img.naturalWidth) * 100;
      // Bias a little above face center so hairline/forehead stays in frame.
      const cy = Math.max(8, (((minY + maxY) / 2) / img.naturalHeight) * 100 - 6);
      const position = `${cx.toFixed(1)}% ${cy.toFixed(1)}%`;
      this.galleryFocus.update((map) => new Map(map).set(photo, position));
    } catch {
      /* Keep the CSS person-biased fallback. */
    }
  }

  protected expandGallery(): void {
    this.galleryExpanded.set(true);
    afterNextRender(() => this.hydrateGalleryImageStates(), { injector: this.injector });
  }

  protected collapseGallery(): void {
    this.galleryExpanded.set(false);
  }

  private pointerX = 0;
  private pointerY = 0;
  private skipLightboxClose = false;

  protected onPointerDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    this.pointerX = event.clientX;
    this.pointerY = event.clientY;
  }

  protected openGalleryPhoto(photo: string): void {
    this.openLightbox(photo);
  }

  protected readonly lightboxCanBrowse = computed(() => {
    const photo = this.lightboxPhoto();
    return !!photo && this.wedding.gallery.includes(photo);
  });

  protected lightboxPrev(): void {
    const i = this.wedding.gallery.indexOf(this.lightboxPhoto() ?? '');
    if (i < 0) {
      return;
    }
    const n = this.wedding.gallery.length;
    this.resetLightboxZoom();
    this.lightboxPhoto.set(this.wedding.gallery[(i - 1 + n) % n]);
  }

  protected lightboxNext(): void {
    const i = this.wedding.gallery.indexOf(this.lightboxPhoto() ?? '');
    if (i < 0) {
      return;
    }
    const n = this.wedding.gallery.length;
    this.resetLightboxZoom();
    this.lightboxPhoto.set(this.wedding.gallery[(i + 1) % n]);
  }

  protected onLightboxPointerUp(event: PointerEvent): void {
    if (this.lightboxZoom() > 1) {
      return;
    }
    if (!this.lightboxCanBrowse()) {
      return;
    }
    const dir = this.swipeDirection(event);
    if (!dir) {
      return;
    }
    this.skipLightboxClose = true;
    if (dir === 'left') {
      this.lightboxNext();
    } else {
      this.lightboxPrev();
    }
  }

  protected onLightboxBackdropClick(): void {
    if (this.skipLightboxClose) {
      this.skipLightboxClose = false;
      return;
    }
    this.closeLightbox();
  }

  private swipeDirection(event: PointerEvent): 'left' | 'right' | null {
    const dx = event.clientX - this.pointerX;
    const dy = event.clientY - this.pointerY;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.15) {
      return null;
    }
    return dx < 0 ? 'left' : 'right';
  }

  @HostListener('document:keydown', ['$event'])
  protected onDocumentKey(event: KeyboardEvent): void {
    if (!this.lightboxPhoto()) {
      return;
    }
    if (event.key === 'ArrowLeft') {
      this.lightboxPrev();
    } else if (event.key === 'ArrowRight') {
      this.lightboxNext();
    } else if (event.key === 'Escape') {
      this.closeLightbox();
    }
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
  protected readonly messengerShareUrl = computed(() => {
    const link = encodeURIComponent(this.shareUrl());
    return `fb-messenger://share/?link=${link}`;
  });
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

  protected readonly lightboxZoom = signal(1);
  private readonly lightboxPan = signal({ x: 0, y: 0 });
  private lightboxPanning = false;
  private lightboxPanStart = { x: 0, y: 0, panX: 0, panY: 0 };
  private lightboxDidPan = false;

  protected readonly lightboxImageTransform = computed(() => {
    const z = this.lightboxZoom();
    const { x, y } = this.lightboxPan();
    return `translate(${x}px, ${y}px) scale(${z})`;
  });

  protected toggleLightboxZoom(event?: Event): void {
    event?.stopPropagation();
    if (this.lightboxZoom() > 1) {
      this.resetLightboxZoom();
    } else {
      this.lightboxZoom.set(2.5);
    }
  }

  protected onLightboxImageTap(event: MouseEvent): void {
    event.stopPropagation();
    if (this.skipLightboxClose) {
      this.skipLightboxClose = false;
      return;
    }
    if (this.lightboxDidPan) {
      this.lightboxDidPan = false;
      return;
    }
    this.toggleLightboxZoom();
  }

  protected onLightboxImagePointerDown(event: PointerEvent): void {
    if (this.lightboxZoom() > 1) {
      event.stopPropagation();
      this.lightboxPanning = true;
      const pan = this.lightboxPan();
      this.lightboxPanStart = {
        x: event.clientX,
        y: event.clientY,
        panX: pan.x,
        panY: pan.y,
      };
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      return;
    }
    this.onPointerDown(event);
  }

  protected onLightboxImagePointerMove(event: PointerEvent): void {
    if (!this.lightboxPanning) {
      return;
    }
    event.stopPropagation();
    const dx = event.clientX - this.lightboxPanStart.x;
    const dy = event.clientY - this.lightboxPanStart.y;
    if (Math.hypot(dx, dy) > 8) {
      this.lightboxDidPan = true;
    }
    this.lightboxPan.set({
      x: this.lightboxPanStart.panX + dx,
      y: this.lightboxPanStart.panY + dy,
    });
  }

  protected onLightboxImagePointerUp(event: PointerEvent): void {
    if (this.lightboxPanning) {
      this.lightboxPanning = false;
      try {
        (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
      } catch {
        /* already released */
      }
      return;
    }
    this.onLightboxPointerUp(event);
  }

  private resetLightboxZoom(): void {
    this.lightboxZoom.set(1);
    this.lightboxPan.set({ x: 0, y: 0 });
    this.lightboxPanning = false;
  }

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
      this.hydrateGalleryImageStates();
      this.setupRsvpDeadlineNotice();

      const url = `${window.location.origin}/`;
      this.shareUrl.set(url);
      this.canNativeShare.set(typeof navigator !== 'undefined' && !!navigator.share);
      this.buildBrandedQrDataUrl(url)
        .then((data) => this.qrDataUrl.set(data))
        .catch(() => this.qrDataUrl.set(null));
    });
  }

  /** Bottom-of-page RSVP deadline warning — shown once per visit. */
  protected readonly rsvpDeadlineOpen = signal(false);
  private static readonly RSVP_NOTICE_KEY = 'gk-rsvp-deadline-seen';

  protected dismissRsvpDeadline(): void {
    this.rsvpDeadlineOpen.set(false);
    try {
      sessionStorage.setItem(WeddingInvitation.RSVP_NOTICE_KEY, '1');
    } catch {
      /* private mode / blocked storage */
    }
  }

  protected goToRsvpFromNotice(): void {
    this.dismissRsvpDeadline();
    document.getElementById('rsvp')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** Open the deadline notice the first time the guest reaches the invitation end. */
  private setupRsvpDeadlineNotice(): void {
    try {
      if (sessionStorage.getItem(WeddingInvitation.RSVP_NOTICE_KEY) === '1') {
        return;
      }
    } catch {
      /* continue without persistence */
    }

    const end = this.host.nativeElement.querySelector('.invite__end') as HTMLElement | null;
    if (!end || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) {
          return;
        }
        this.rsvpDeadlineOpen.set(true);
        observer.disconnect();
      },
      { root: null, threshold: 0.35 },
    );

    observer.observe(end);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  /** QR with nav logo composited in the centre (high error correction). */
  private buildBrandedQrDataUrl(url: string): Promise<string> {
    return QRCode.toDataURL(url, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 640,
      color: { dark: '#6b3b2e', light: '#ffffff' },
    }).then((qrData) => this.compositeQrLogo(qrData, WeddingInvitation.QR_LOGO));
  }

  private compositeQrLogo(qrDataUrl: string, logoSrc: string): Promise<string> {
    return new Promise((resolve) => {
      const qr = new Image();
      qr.onload = () => {
        const logo = new Image();
        logo.onload = () => {
          const size = qr.width;
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(qrDataUrl);
            return;
          }
          ctx.drawImage(qr, 0, 0);

          const cx = size / 2;
          const cy = size / 2;
          const outerR = size * 0.12;
          const innerR = size * 0.102;
          const ring = outerR - innerR;

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(cx, cy, outerR + ring * 0.35, 0, Math.PI * 2);
          ctx.fill();

          const fit = innerR * 1.65;
          const scale = Math.min(fit / logo.width, fit / logo.height);
          const logoW = logo.width * scale;
          const logoH = logo.height * scale;

          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(logo, cx - logoW / 2, cy - logoH / 2, logoW, logoH);
          ctx.restore();

          resolve(canvas.toDataURL('image/png'));
        };
        logo.onerror = () => resolve(qrDataUrl);
        logo.src = logoSrc;
      };
      qr.onerror = () => resolve(qrDataUrl);
      qr.src = qrDataUrl;
    });
  }

  protected openQr(): void {
    this.qrOpen.set(true);
  }

  protected closeQr(): void {
    this.qrOpen.set(false);
  }

  /** True while the themed QR card PNG is being composed for download. */
  protected readonly qrDownloading = signal(false);

  /** Build a themed invitation card (header + QR) and download it as PNG. */
  protected async downloadQr(): Promise<void> {
    const qr = this.qrDataUrl();
    if (!qr || this.qrDownloading()) {
      return;
    }

    this.qrDownloading.set(true);
    try {
      const dataUrl = await this.buildDownloadableQrCard(qr);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${this.wedding.groom.toLowerCase()}-${this.wedding.bride.toLowerCase()}-wedding-invitation-qr.png`;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      /* keep modal usable if canvas/fonts fail */
    } finally {
      this.qrDownloading.set(false);
    }
  }

  /** Cream card with gold frame, names header, and branded QR — wedding palette. */
  private async buildDownloadableQrCard(qrDataUrl: string): Promise<string> {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    const qrImg = await this.loadImage(qrDataUrl);
    const width = 1080;
    const height = 1480;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas unavailable');
    }

    // Blush → cream wash
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#f7ebe3');
    bg.addColorStop(0.45, '#fbf6f1');
    bg.addColorStop(1, '#ecd4c4');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Soft peach glow behind the card
    const glow = ctx.createRadialGradient(width / 2, height * 0.28, 40, width / 2, height * 0.35, width * 0.55);
    glow.addColorStop(0, 'rgba(227, 163, 121, 0.28)');
    glow.addColorStop(1, 'rgba(227, 163, 121, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    // Outer gold frame
    const inset = 48;
    ctx.strokeStyle = 'rgba(195, 164, 107, 0.95)';
    ctx.lineWidth = 3;
    ctx.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
    ctx.strokeStyle = 'rgba(195, 164, 107, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(inset + 14, inset + 14, width - (inset + 14) * 2, height - (inset + 14) * 2);

    // Header
    const names = `${this.wedding.groom} & ${this.wedding.bride}`;
    ctx.fillStyle = '#6e5224';
    ctx.textAlign = 'center';
    ctx.font = '400 92px "Great Vibes", cursive';
    ctx.fillText(names, width / 2, 220);

    // Gold rule under names
    this.drawGoldRule(ctx, width / 2, 268, 280);

    ctx.fillStyle = '#a67c52';
    ctx.font = '600 28px Cinzel, serif';
    this.fillSpacedText(ctx, 'WEDDING INVITATION', width / 2, 330, 8);

    ctx.fillStyle = '#6e5c4e';
    ctx.font = '500 26px "Cormorant Garamond", serif';
    const { month, day, year } = this.wedding.dateLong;
    ctx.fillText(`${month} ${day}, ${year}`, width / 2, 380);

    // QR panel
    const qrSize = 640;
    const qrX = (width - qrSize) / 2;
    const qrY = 460;
    const panelX = qrX - 28;
    const panelY = qrY - 28;
    const panelSize = qrSize + 56;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(94, 70, 53, 0.12)';
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 10;
    this.roundRectPath(ctx, panelX, panelY, panelSize, panelSize, 18);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.strokeStyle = 'rgba(195, 164, 107, 0.65)';
    ctx.lineWidth = 2;
    this.roundRectPath(ctx, panelX, panelY, panelSize, panelSize, 18);
    ctx.stroke();

    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    // Footer
    this.drawGoldRule(ctx, width / 2, 1200, 200);
    ctx.fillStyle = '#6e5c4e';
    ctx.font = '500 30px "Cormorant Garamond", serif';
    ctx.fillText('Scan to open our invitation', width / 2, 1260);

    ctx.fillStyle = '#a67c52';
    ctx.font = '600 20px Cinzel, serif';
    ctx.fillText(this.wedding.monogram, width / 2, 1320);

    return canvas.toDataURL('image/png');
  }

  private drawGoldRule(ctx: CanvasRenderingContext2D, cx: number, y: number, halfWidth: number): void {
    const grad = ctx.createLinearGradient(cx - halfWidth, y, cx + halfWidth, y);
    grad.addColorStop(0, 'rgba(195, 164, 107, 0)');
    grad.addColorStop(0.5, 'rgba(195, 164, 107, 0.9)');
    grad.addColorStop(1, 'rgba(195, 164, 107, 0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - halfWidth, y);
    ctx.lineTo(cx + halfWidth, y);
    ctx.stroke();

    ctx.fillStyle = '#cf8f6b';
    ctx.beginPath();
    ctx.moveTo(cx, y - 5);
    ctx.lineTo(cx + 5, y);
    ctx.lineTo(cx, y + 5);
    ctx.lineTo(cx - 5, y);
    ctx.closePath();
    ctx.fill();
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = src;
    });
  }

  private roundRectPath(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  private fillSpacedText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    letterGap: number,
  ): void {
    const chars = [...text];
    const widths = chars.map((ch) => ctx.measureText(ch).width);
    const total =
      widths.reduce((sum, w) => sum + w, 0) + letterGap * Math.max(0, chars.length - 1);
    let cursor = x - total / 2;
    for (let i = 0; i < chars.length; i++) {
      ctx.fillText(chars[i], cursor + widths[i] / 2, y);
      cursor += widths[i] + letterGap;
    }
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
    this.resetLightboxZoom();
    this.lightboxPhoto.set(photo);
  }

  protected closeLightbox(): void {
    this.resetLightboxZoom();
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
