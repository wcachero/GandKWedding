/**
 * All wedding content lives here so the components stay presentational.
 */
export interface WeddingEvent {
  readonly title: string;
  readonly kicker: string;
  readonly time: string;
  readonly venue: string;
  readonly address: string;
  /** Location query used to build the Google Maps embed + link. */
  readonly mapQuery: string;
  /** Optional venue photo (path under /public). Shown only if the file loads. */
  readonly photo?: string;
}

export interface DressSwatch {
  readonly name: string;
  readonly color: string;
}

export interface Wedding {
  readonly groom: string;
  readonly bride: string;
  readonly monogram: string;
  /** ISO date used for the live countdown. */
  readonly dateIso: string;
  readonly dateShort: string;
  readonly dateLong: { readonly month: string; readonly monthShort: string; readonly day: string; readonly year: string; readonly weekday: string };
  readonly ceremonyTime: string;
  readonly heroPhoto: string;
  readonly saveTheDatePhoto: string;
  readonly gallery: readonly string[];
  readonly ceremony: WeddingEvent;
  readonly reception: WeddingEvent;
  readonly dressCode: {
    readonly title: string;
    readonly ladiesImage: string;
    readonly gentlemenImage: string;
    readonly swatches: readonly DressSwatch[];
    readonly note: string;
  };
  readonly rsvp: {
    readonly url: string;
    readonly note: string;
    /** Soft deadline shown on the invitation (e.g. November 8, 2026). */
    readonly deadline: string;
    readonly contacts: readonly { readonly name: string; readonly phone: string }[];
    readonly reservedNote: string;
  };
  readonly entourage: {
    readonly parentsOfGroom: readonly string[];
    readonly parentsOfBride: readonly string[];
    readonly principalSponsors: readonly { readonly gentlemen: string; readonly ladies: string }[];
    readonly bestMan: string;
    readonly maidOfHonor: string;
    readonly secondarySponsors: readonly { readonly role: string; readonly pair: string }[];
    readonly bearers: readonly { readonly role: string; readonly name: string }[];
    readonly flowerGirls: readonly string[];
  };
  readonly socials: readonly { readonly label: string; readonly url: string; readonly icon: 'facebook' | 'instagram' | 'tiktok' | 'email' }[];
}

export const WEDDING: Wedding = {
  groom: 'Gilfred',
  bride: 'Karyle',
  monogram: 'G & K',
  dateIso: '2026-12-19T08:30:00+08:00',
  dateShort: '12.19.26',
  dateLong: { month: 'December', monthShort: 'Dec', day: '19', year: '2026', weekday: 'Saturday' },
  ceremonyTime: 'Ceremony',
  heroPhoto: 'images/couple-hero.jpg',
  saveTheDatePhoto: 'images/save-the-date.jpg',
  gallery: Array.from(
    { length: 64 },
    (_, i) => `images/gallery/g${String(i + 1).padStart(2, '0')}.jpg`,
  ),
  ceremony: {
    title: 'Santa Rosa de Lima Parish Church',
    kicker: 'The Ceremony',
    time: '8:30am',
    venue: 'Santa Rosa de Lima Parish Church',
    address: 'F. Gomez Street, Brgy. Kanluran, City of Santa Rosa, Laguna',
    mapQuery: 'Santa Rosa de Lima Parish Church, F. Gomez Street, Brgy. Kanluran, Santa Rosa, Laguna',
    photo: 'images/ceremony-venue.jpg', // drop this file in public/images to show it
  },
  reception: {
    title: 'Sherinal Events Place — Grand Pavilion',
    kicker: 'The Reception',
    time: "We'll gather for a lovely lunch in a comfortable indoor setting",
    venue: 'Sherinal Events Place — Grand Pavilion',
    address: 'Presentacion St., Zavalla 3 Subdivision, Brgy. Tagapo, Santa Rosa, Laguna',
    mapQuery: 'Sherinal Events Place, Zavalla 3 Subdivision, Brgy. Tagapo, Santa Rosa, Laguna',
    photo: 'images/reception-venue.jpg', // drop this file in public/images to show it
  },
  dressCode: {
    title: 'Semi-Formal Attire',
    ladiesImage: 'images/attire-ladies.jpg',
    gentlemenImage: 'images/attire-gentlemen.jpg',
    swatches: [
      { name: 'Warm Peach', color: 'var(--swatch-warm-peach)' },
      { name: 'Soft Blush', color: 'var(--swatch-soft-blush)' },
      { name: 'Muted Gold', color: 'var(--swatch-muted-gold)' },
      { name: 'Champagne', color: 'var(--swatch-champagne)' },
    ],
    note: 'Semi-formal attire in Warm Peach, Soft Blush, Muted Gold, and Champagne colors are welcome.',
  },
  rsvp: {
    url: 'https://script.google.com/macros/s/AKfycbzJQmmnqci0N9stgHUoOX-v8p6mzRAyy82rrWXM1H-_45GBf2OdveebLXvxQTR9WKeJ/exec',
    note: 'Every seat is reserved with love and intention. Kindly confirm your attendance below.',
    deadline: 'November 8, 2026',
    contacts: [
      { name: 'Karyle', phone: '0926 851 9693' },
      { name: 'Gilfred', phone: '0995 927 9620' },
    ],
    reservedNote:
      'Only guests with confirmed RSVPs will be accommodated at the celebration. We respectfully ask that you refer to the number of reserved seats indicated in your invitation.',
  },
  entourage: {
    parentsOfGroom: [
      'Mr. Virgilio Donal Dueñas',
      'Mrs. Wenifreda Encina Dueñas',
    ],
    parentsOfBride: [
      'Mr. Lorenzo Getape Lechuga',
      'Mrs. Inday Cardama Lechuga',
    ],
    principalSponsors: [
      { gentlemen: 'Mr. Alberto Manansala', ladies: 'Mrs. Annie Lera' },
      { gentlemen: 'Mr. Elmer Brillantes', ladies: 'Mrs. Buenafe Marasigan' },
      { gentlemen: 'Mr. Jerwell Encina', ladies: 'Mrs. Emily Encina' },
      { gentlemen: 'Mr. Jesus Bautista', ladies: 'Mrs. Ester Ariete' },
      { gentlemen: 'Mr. John Itto Chua III', ladies: 'Mrs. Aileen Padua' },
      { gentlemen: 'Mr. Jose Alimorom', ladies: 'Mrs. Krystel Len Exconde' },
      { gentlemen: 'Mr. Rommel Gonzales', ladies: 'Mrs. Lorna Villasenor' },
    ],
    bestMan: 'Mr. Russel De Mata',
    maidOfHonor: 'Ms. Cholyn Axel Cabello',
    secondarySponsors: [
      { role: 'Candle', pair: 'Mr. Laj Christian Bautista & Ms. Kristine Naling' },
      { role: 'Cord', pair: 'Mr. Yajnyl Bautista & Ms. Girlie Dueñas' },
      { role: 'Veil', pair: 'Mr. Regi Rajine Bautista & Ms. Jezzelle Seredilla' },
    ],
    bearers: [
      { role: 'Ring Bearer', name: 'Nicholas Cardama' },
      { role: 'Coin Bearer', name: 'Kenshin Flores' },
      { role: 'Bible Bearer', name: 'King Raiden Lechuga' },
    ],
    flowerGirls: [
      'Khloe Adrianne Alimorom',
      'Keily Jedidiah Colico',
    ],
  },
  socials: [
    { label: 'Facebook', url: 'https://facebook.com/wcachero', icon: 'facebook' },
    { label: 'Instagram', url: '#', icon: 'instagram' },   // add real link when available
    { label: 'TikTok', url: '#', icon: 'tiktok' },         // add real link when available
    { label: 'Email', url: 'mailto:hello@example.com', icon: 'email' },
  ],
};
