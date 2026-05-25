import { FlightDeal, TripItinerary } from '../types';

// Structured for future Skyscanner/Amadeus integration.
// Skyscanner API: https://developers.skyscanner.net
// Amadeus API: https://developers.amadeus.com

export async function fetchFlightDeals(_originCode: string = 'JFK'): Promise<FlightDeal[]> {
  return MOCK_FLIGHT_DEALS;
}

export async function fetchDealById(id: string): Promise<FlightDeal | null> {
  return MOCK_FLIGHT_DEALS.find(d => d.id === id) || null;
}

const today = new Date();
function futureDate(daysOut: number): string {
  const d = new Date(today);
  d.setDate(today.getDate() + daysOut);
  return d.toISOString().split('T')[0];
}

const LISBON_ITINERARY: TripItinerary = {
  intro: 'Lisbon is having a moment and it knows it — but it hasn\'t lost itself yet. The food is quietly spectacular, the wine costs nothing, and the city runs on its own unhurried clock.',
  days: [
    { day: 1, title: 'Get Lost in Alfama', activities: [
      { time: 'Morning', name: 'Pastéis de Belém', description: 'The original custard tart. Get there before the line gets absurd.', type: 'food' },
      { time: 'Afternoon', name: 'Tram 28 through Alfama', description: 'Touristy but genuinely fun. Get off and walk the winding alleys.', type: 'activity' },
      { time: 'Evening', name: 'Taberna da Rua das Flores', description: 'Old-school Portuguese petiscos and natural wine. No reservations, get there at 7.', type: 'food' },
    ]},
    { day: 2, title: 'Bairro Alto & Mouraria', activities: [
      { time: 'Morning', name: 'Time Out Market', description: 'Yes it\'s a food hall, yes it\'s touristy, yes it\'s worth it for the pastel de nata alone.', type: 'food' },
      { time: 'Afternoon', name: 'LX Factory', description: 'Converted industrial space with independent shops, studios, and a great Sunday market.', type: 'neighborhood' },
      { time: 'Evening', name: 'Fado at Sr. Fado', description: 'Live fado in Mouraria, the neighborhood that invented it. Unbelievably good.', type: 'activity' },
    ]},
    { day: 3, title: 'Day Trip: Sintra or Setúbal', activities: [
      { time: 'Morning', name: 'Train to Sintra', description: 'Fairy-tale palaces 40 min from Lisbon. Go early, it gets crowded.', type: 'transport' },
      { time: 'Afternoon', name: 'Pena Palace', description: 'Impossibly colorful 19th-century palace. Views that don\'t feel real.', type: 'activity' },
      { time: 'Evening', name: 'Back to Bairro Alto', description: 'Dinner and drinks in the party neighborhood. It goes late.', type: 'neighborhood' },
    ]},
  ],
  hiddenGems: [
    'Cervejaria Ramiro — the best seafood meal of your life, cash only',
    'Miradouro da Graça — locals\' viewpoint, fewer tourists than the famous ones',
    'A Cevicheria — creative Peruvian-Portuguese fusion in Príncipe Real',
    'Museu Nacional do Azulejo — tile museum that sounds boring and is incredible',
  ],
  neighborhoods: ['Alfama', 'Bairro Alto', 'Mouraria', 'Príncipe Real', 'LX Factory'],
  bestTimeToGo: 'April–June or September–October. Avoid August — it\'s packed and expensive.',
  localTips: [
    'Everything costs less than you expect. Budget $60/day and eat very well.',
    'The metro is excellent. You don\'t need Uber.',
    'Dinner doesn\'t start until 8pm at the earliest.',
    'Bring layers — the ocean wind is real even in summer.',
  ],
};

const CDMX_ITINERARY: TripItinerary = {
  intro: 'Mexico City will seduce you slowly, then all at once. The food scene rivals Paris, the culture runs centuries deep, and the energy at 11pm on a Tuesday is something you\'ll spend years trying to recreate.',
  days: [
    { day: 1, title: 'Polanco & Roma Norte', activities: [
      { time: 'Morning', name: 'Mercado de Medellín', description: 'Local market in Colonia Roma. Fresh juice and tamales, no tourists.', type: 'food' },
      { time: 'Afternoon', name: 'Museo Nacional de Antropología', description: 'Two hours minimum. One of the best museums in the world, full stop.', type: 'activity' },
      { time: 'Evening', name: 'Contramar', description: 'The tuna tostada that made Condesa famous. Book ahead.', type: 'food' },
    ]},
    { day: 2, title: 'Coyoacán & Xochimilco', activities: [
      { time: 'Morning', name: 'Frida Kahlo Museum', description: 'Buy tickets in advance — they sell out weeks ahead.', type: 'activity' },
      { time: 'Afternoon', name: 'Xochimilco trajineras', description: 'Float through canals on a flat-bottom boat. Get the one with the beer stand.', type: 'activity' },
      { time: 'Evening', name: 'Taco al pastor in La Condesa', description: 'Street taco at El Vilsito — opens at 9pm, it\'s worth the wait.', type: 'food' },
    ]},
    { day: 3, title: 'Teotihuacán Day Trip', activities: [
      { time: 'Morning', name: 'Pyramids of Teotihuacán', description: 'Leave by 7am to beat the crowds. Climb the Pyramid of the Sun.', type: 'activity' },
      { time: 'Afternoon', name: 'Pulque tasting at a local spot', description: 'The fermented cactus drink you can\'t get at home. Acquire taste not required.', type: 'food' },
      { time: 'Evening', name: 'Mezcalería in Roma', description: 'End the trip in Roma Norte with mezcal and some of the best people-watching in the city.', type: 'food' },
    ]},
  ],
  hiddenGems: [
    'Quintonil — arguably better than Pujol and half the wait',
    'Librería El Péndulo — bookshop with a café inside, locals love it',
    'Tepito market — chaotic and incredible. Don\'t bring your passport.',
    'Café de Tacuba — 100-year-old cantina, cash only, order the mole',
  ],
  neighborhoods: ['Roma Norte', 'Condesa', 'Polanco', 'Coyoacán', 'Colonia Juárez'],
  bestTimeToGo: 'October–April. Rainy season (May–Sept) means afternoon downpours but emptier streets.',
  localTips: [
    'The altitude is real — 7,350 feet. Drink water, take it easy day one.',
    'Uber works great and is dirt cheap. Skip the street taxis.',
    'Carry cash. Many of the best places are cash-only.',
    'Altitude makes alcohol hit harder. Proceed accordingly.',
  ],
};

export const MOCK_FLIGHT_DEALS: FlightDeal[] = [
  {
    id: 'fd1',
    destination: {
      city: 'Lisbon', country: 'Portugal', code: 'LIS',
      description: 'Seven hills, pastel facades, and the best $4 wine you\'ve ever had.',
      imageGradient: ['#F7971E', '#FFD200'],
      timezone: 'WET',
      highlights: ['Alfama tram rides', 'Pastéis de Belém', 'Sunset at Miradouro da Graça', 'LX Factory Sunday market'],
    },
    origin: { city: 'New York', code: 'JFK' },
    price: 389, averagePrice: 720, savingsPercent: 46,
    tripLength: { min: 5, max: 10 },
    departureDates: [
      { date: futureDate(8), returnDate: futureDate(15), price: 389, airline: 'TAP Air Portugal', stops: 0 },
      { date: futureDate(12), returnDate: futureDate(19), price: 412, airline: 'TAP Air Portugal', stops: 0 },
      { date: futureDate(15), returnDate: futureDate(22), price: 445, airline: 'United Airlines', stops: 1 },
    ],
    bookingUrl: 'https://www.google.com/flights',
    tags: ['Europe', 'City Break', 'Food & Wine', 'Beach Nearby'],
    whyNow: 'Spring shoulder season — warm, uncrowded, and cheaper than summer by 30%.',
    itinerary: LISBON_ITINERARY,
  },
  {
    id: 'fd2',
    destination: {
      city: 'Mexico City', country: 'Mexico', code: 'MEX',
      description: 'World-class food, ancient ruins, and a nightlife that goes until noon.',
      imageGradient: ['#11998e', '#38ef7d'],
      timezone: 'CST',
      highlights: ['Polanco neighborhood', 'Pujol (or a taco al pastor at 2am)', 'Frida Kahlo Museum', 'Xochimilco floating gardens'],
    },
    origin: { city: 'New York', code: 'JFK' },
    price: 218, averagePrice: 420, savingsPercent: 48,
    tripLength: { min: 3, max: 7 },
    departureDates: [
      { date: futureDate(6), returnDate: futureDate(10), price: 218, airline: 'Aeromexico', stops: 0 },
      { date: futureDate(10), returnDate: futureDate(14), price: 241, airline: 'Delta', stops: 0 },
      { date: futureDate(14), returnDate: futureDate(18), price: 267, airline: 'American Airlines', stops: 1 },
    ],
    bookingUrl: 'https://www.google.com/flights',
    tags: ['Latin America', 'Food Scene', 'Culture', 'Long Weekend'],
    whyNow: 'Día de los Muertos preparations starting — the city is electric right now.',
    itinerary: CDMX_ITINERARY,
  },
  {
    id: 'fd3',
    destination: {
      city: 'Nashville', country: 'USA', code: 'BNA',
      description: 'More than honky-tonks — Nashville right now is one of the most exciting food cities in America.',
      imageGradient: ['#8E2DE2', '#4A00E0'],
      timezone: 'CST',
      highlights: ['12 South neighborhood', 'Prince\'s Hot Chicken', 'Live music on Broadway', 'The Gulch murals'],
    },
    origin: { city: 'New York', code: 'JFK' },
    price: 87, averagePrice: 195, savingsPercent: 55,
    tripLength: { min: 2, max: 4 },
    departureDates: [
      { date: futureDate(4), returnDate: futureDate(6), price: 87, airline: 'Southwest', stops: 0 },
      { date: futureDate(7), returnDate: futureDate(9), price: 92, airline: 'Southwest', stops: 0 },
      { date: futureDate(11), returnDate: futureDate(14), price: 104, airline: 'Delta', stops: 0 },
    ],
    bookingUrl: 'https://www.google.com/flights',
    tags: ['Domestic', 'Long Weekend', 'Food Scene', 'Music'],
    whyNow: 'CMA Fest week — every venue in the city has live music.',
  },
  {
    id: 'fd4',
    destination: {
      city: 'Reykjavik', country: 'Iceland', code: 'KEF',
      description: 'Midnight sun in summer, Northern Lights in winter. The whole country is the attraction.',
      imageGradient: ['#2980B9', '#6DD5FA'],
      timezone: 'GMT',
      highlights: ['Golden Circle day trip', 'Blue Lagoon', 'Hallgrímskirkja views', 'Geysir and waterfalls'],
    },
    origin: { city: 'New York', code: 'JFK' },
    price: 342, averagePrice: 680, savingsPercent: 50,
    tripLength: { min: 4, max: 8 },
    departureDates: [
      { date: futureDate(9), returnDate: futureDate(14), price: 342, airline: 'Icelandair', stops: 0 },
      { date: futureDate(13), returnDate: futureDate(18), price: 371, airline: 'Icelandair', stops: 0 },
    ],
    bookingUrl: 'https://www.google.com/flights',
    tags: ['Europe', 'Nature', 'Adventure', 'Unique'],
    whyNow: 'Northern Lights season peaks this month. Clear skies forecast.',
  },
  {
    id: 'fd5',
    destination: {
      city: 'Buenos Aires', country: 'Argentina', code: 'EZE',
      description: 'Steak, tango, Palermo bookshops — and your dollar goes embarrassingly far right now.',
      imageGradient: ['#C9D6FF', '#E2E2E2'],
      timezone: 'ART',
      highlights: ['La Boca neighborhood', 'Parrilla dinner at midnight', 'MALBA museum', 'San Telmo Sunday market'],
    },
    origin: { city: 'New York', code: 'JFK' },
    price: 478, averagePrice: 950, savingsPercent: 50,
    tripLength: { min: 7, max: 14 },
    departureDates: [
      { date: futureDate(11), returnDate: futureDate(21), price: 478, airline: 'LATAM', stops: 1 },
      { date: futureDate(16), returnDate: futureDate(26), price: 512, airline: 'Aerolíneas Argentinas', stops: 1 },
    ],
    bookingUrl: 'https://www.google.com/flights',
    tags: ['South America', 'Food Scene', 'Culture', 'Week+ Trip'],
    whyNow: 'Tango festival running through the end of the month. The milongas are free.',
  },
  {
    id: 'fd6',
    destination: {
      city: 'New Orleans', country: 'USA', code: 'MSY',
      description: 'The city that invented a good time. Jazz, gumbo, and that thing in the air that makes you forget what day it is.',
      imageGradient: ['#f7971e', '#ffd200'],
      timezone: 'CST',
      highlights: ['Frenchmen Street live music', 'Commander\'s Palace brunch', 'Garden District walking tour', 'Café Du Monde beignets'],
    },
    origin: { city: 'New York', code: 'JFK' },
    price: 112, averagePrice: 240, savingsPercent: 53,
    tripLength: { min: 3, max: 5 },
    departureDates: [
      { date: futureDate(5), returnDate: futureDate(8), price: 112, airline: 'Spirit', stops: 0 },
      { date: futureDate(8), returnDate: futureDate(12), price: 128, airline: 'Delta', stops: 0 },
    ],
    bookingUrl: 'https://www.google.com/flights',
    tags: ['Domestic', 'Food Scene', 'Music', 'Long Weekend'],
    whyNow: 'French Quarter Fest this weekend — best food lineup of the year.',
  },
  {
    id: 'fd7',
    destination: {
      city: 'Tokyo', country: 'Japan', code: 'NRT',
      description: 'The most ordered city on earth, with chaos hiding everywhere you look for it.',
      imageGradient: ['#FC5C7D', '#6A3093'],
      timezone: 'JST',
      highlights: ['Shinjuku at 2am', 'Tsukiji fish market breakfast', 'Yanaka neighborhood', 'Onsen day trip to Hakone'],
    },
    origin: { city: 'New York', code: 'JFK' },
    price: 680, averagePrice: 1100, savingsPercent: 38,
    tripLength: { min: 8, max: 14 },
    departureDates: [
      { date: futureDate(14), returnDate: futureDate(24), price: 680, airline: 'ANA', stops: 0 },
      { date: futureDate(18), returnDate: futureDate(28), price: 710, airline: 'Japan Airlines', stops: 0 },
    ],
    bookingUrl: 'https://www.google.com/flights',
    tags: ['Asia', 'Culture', 'Food Scene', 'Week+ Trip'],
    whyNow: 'Cherry blossom season. Ueno Park will be perfect in two weeks.',
  },
];
