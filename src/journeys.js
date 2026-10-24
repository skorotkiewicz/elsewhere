/* ================================================================
   YOUR JOURNEYS — replace the sample YouTube IDs with your own.
   `at` is seconds AFTER startSeconds, not an absolute timestamp.
   Stops and announcements are a fictional soundscape, not a guide
   to the actual route in the footage. No video's audio is played.
   Available events: announce, stop, ticketCheck.
   A stop can have `name` and `duration` (seconds).
   ================================================================ */
export const JOURNEYS = [
  {
    id: 'tokyo', title: 'Tokyo after hours', videoId: 'ebwzuZsZR8Q', startSeconds: 30,
    language: 'ja-JP', city: 'Tokyo', country: 'Japan', vehicle: 'taxi', line: '01',
    timezone: 'Asia/Tokyo', destination: 'Shinjuku', mood: 'Neon lights. Quiet streets.', tag: 'NIGHT DRIVE',
    durationLabel: '18 min', image: 'tokyo',
    stops: [
      { at: 12, type: 'announce', text: 'ご乗車ありがとうございます。次は、新宿です。', subtitle: 'Welcome aboard. Next stop, Shinjuku.', name: 'Shinjuku' },
      { at: 60, type: 'stop', duration: 8, name: 'Shinjuku' },
      { at: 90, type: 'announce', text: '次は、代々木です。どうぞ、ごゆっくり。', subtitle: 'Next stop, Yoyogi. Make yourself comfortable.', name: 'Yoyogi' },
      { at: 140, type: 'ticketCheck', text: '乗車券を拝見いたします。', subtitle: 'Your ticket, please. Thank you for riding with us.' },
      { at: 190, type: 'stop', duration: 10, name: 'Yoyogi' },
      { at: 220, type: 'announce', text: '次は、渋谷です。夜の街をお楽しみください。', subtitle: 'Next stop, Shibuya. Enjoy the city at night.', name: 'Shibuya' },
      { at: 300, type: 'stop', duration: 9, name: 'Shibuya' }
    ]
  },
  {
    id: 'lisbon', title: 'The last tram home', videoId: 'gqI1bA1PHAU', startSeconds: 0,
    language: 'pt-PT', city: 'Lisbon', country: 'Portugal', vehicle: 'tram', line: '28',
    timezone: 'Europe/Lisbon', destination: 'Graça', mood: 'Old streets. A slower rhythm.', tag: 'TRAM RIDE',
    durationLabel: '6 min', image: 'lisbon',
    stops: [
      { at: 15, type: 'announce', text: 'Boa noite. Próxima paragem: Graça.', subtitle: 'Good evening. Next stop: Graça.', name: 'Graça' },
      { at: 60, type: 'stop', duration: 9, name: 'Graça' },
      { at: 85, type: 'announce', text: 'Próxima paragem: Portas do Sol.', subtitle: 'Next stop: Portas do Sol.', name: 'Portas do Sol' },
      { at: 140, type: 'ticketCheck', text: 'Os bilhetes, por favor.', subtitle: 'Tickets, please. Thank you.' },
      { at: 180, type: 'stop', duration: 8, name: 'Portas do Sol' }
    ]
  },
  {
    id: 'berlin', title: 'Midnight in Berlin', videoId: '5z7HU9XrsAM', startSeconds: 15,
    language: 'de-DE', city: 'Berlin', country: 'Germany', vehicle: 'car', line: '03',
    timezone: 'Europe/Berlin', destination: 'Alexanderplatz', mood: 'City lights. Nothing to do.', tag: 'NIGHT DRIVE',
    durationLabel: '52 min', image: 'berlin',
    stops: [
      { at: 25, type: 'announce', text: 'Guten Abend. Nächster Halt: Alexanderplatz.', subtitle: 'Good evening. Next stop: Alexanderplatz.', name: 'Alexanderplatz' },
      { at: 65, type: 'stop', duration: 8, name: 'Alexanderplatz' },
      { at: 95, type: 'announce', text: 'Nächster Halt: Marktplatz.', subtitle: 'Next stop: Market Square.', name: 'Marktplatz' },
      { at: 140, type: 'ticketCheck', text: 'Die Fahrkarten, bitte.', subtitle: 'Your tickets, please.' },
      { at: 200, type: 'stop', duration: 10, name: 'Marktplatz' }
    ]
  },
  {
    id: 'newyork', title: 'New York, no rush', videoId: 'UPrPATfWJ2g', startSeconds: 45,
    language: 'en-US', city: 'New York', country: 'United States', vehicle: 'taxi', line: '04',
    timezone: 'America/New_York', destination: 'Times Square', mood: 'A little lost. In a good way.', tag: 'YELLOW CAB',
    durationLabel: '60 min', image: 'newyork',
    stops: [
      { at: 15, type: 'announce', text: 'Welcome aboard. Next stop, Times Square.', subtitle: 'Bienvenido. Próxima parada: Times Square.', name: 'Times Square' },
      { at: 65, type: 'stop', duration: 10, name: 'Times Square' },
      { at: 90, type: 'announce', text: 'Next stop, Greenwich Village. Sit back and enjoy the ride.', subtitle: 'Próxima parada: Greenwich Village. Disfruta del viaje.', name: 'Greenwich Village' },
      { at: 140, type: 'ticketCheck', text: 'May I see your ticket? Thank you.', subtitle: 'Su billete, por favor. Gracias.' },
      { at: 220, type: 'stop', duration: 8, name: 'Greenwich Village' }
    ]
  }
];
