/**
 * Generates rich, date-aware NYC context for AI recommendations.
 * Includes sports schedules, seasonal events, city happenings, and
 * time-of-day patterns so Claude can surface truly timely plan ideas.
 */

import { WeatherData } from '../types';
import { format } from 'date-fns';

export interface NYCContext {
  dateLabel: string;
  timeBlock: 'morning' | 'afternoon' | 'evening' | 'night';
  isWeekend: boolean;
  sportsContext: string[];
  cityEvents: string[];
  weatherNarrative: string;
  fullPromptContext: string;
}

// ─── Sports calendar ──────────────────────────────────────────────────────────

function getSportsContext(month: number, day: number, dow: number): string[] {
  const events: string[] = [];

  // NBA Playoffs: April–June
  if (month === 4) {
    events.push("NBA First Round in progress — local watch parties filling up bars citywide.");
  }
  if (month === 5 && day <= 15) {
    events.push("NBA Conference Semifinals happening. Knicks playoff run has the whole city locked in.");
  }
  if (month === 5 && day >= 16) {
    events.push("NBA Conference Finals: Knicks are playing for a trip to the Finals for the first time since 1999 — bars around MSG (Midtown/Hell's Kitchen) and the East Village are electric on game nights.");
  }
  if (month === 6 && day <= 20) {
    events.push("NBA FINALS: Knicks in the Finals for the first time since 1999. Every sports bar in the city is sold out for games — book your spot early. Standings, Nevada Smiths, The Ainsworth, and bars around MSG are the spots.");
  }

  // Yankees / Mets: April–October
  if (month >= 4 && month <= 10) {
    if (dow >= 1 && dow <= 4) {
      events.push("Yankees or Mets home game likely tonight — the Bronx and Citi Field areas will have crowds.");
    }
    events.push("MLB season is active — outdoor Bronx Alehouse or Citi Field bars are great pre/post game.");
  }

  // US Open Tennis: Late August
  if (month === 8 && day >= 25) {
    events.push("US Open Tennis at Flushing Meadows — Queensborough/LIC restaurant scene is buzzing.");
  }

  // NYC Marathon: First Sunday in November
  if (month === 11 && day <= 7 && dow === 0) {
    events.push("NYC Marathon day — streets near Central Park, Brooklyn, and Queens are closed. Stay local or head to a finish-line bar in the park.");
  }

  // Super Bowl adjacent
  if (month === 2 && day <= 15) {
    events.push("Super Bowl season — sports bars doing watch parties with big food and drink deals.");
  }

  return events;
}

// ─── Seasonal & city events ───────────────────────────────────────────────────

function getCityEvents(month: number, day: number, dow: number, isWeekend: boolean): string[] {
  const events: string[] = [];

  // Fleet Week NYC: Usually third week of May
  if (month === 5 && day >= 20 && day <= 28) {
    events.push("Fleet Week: Navy ships docked on the West Side — unique energy around Hell's Kitchen, Chelsea Piers, and Midtown.");
  }

  // Memorial Day Weekend
  if (month === 5 && day >= 23 && day <= 26 && isWeekend) {
    events.push("Memorial Day Weekend: Rooftop parties and bar crawls all over Brooklyn and Manhattan. Expect crowds everywhere outdoor.");
  }

  // Independence Day
  if (month === 7 && day >= 3 && day <= 5) {
    events.push("July 4th weekend: Macy's fireworks from the East River, rooftop bars fully booked — Brooklyn Heights Promenade and LIC waterfront are the spots without a reservation.");
  }

  // Halloween
  if (month === 10 && day >= 28) {
    events.push("Halloween week: Village Halloween Parade on 6th Ave, bars in the West Village and LES are packed with costumes.");
  }

  // NYC Restaurant Week: Usually Jan + July
  if ((month === 1 && day <= 25) || (month === 7 && day >= 14)) {
    events.push("NYC Restaurant Week: Prix-fixe menus at top restaurants — great time to try places like Balthazar, Le Bernardin, or Nobu.");
  }

  // Outdoor movie season: June–August
  if (month >= 6 && month <= 8) {
    events.push("Outdoor movie season in full swing — Bryant Park and Hudson River Park do free screenings on select evenings.");
    events.push("Summer Fridays: Offices let out early, happy hour starting at 4pm at Chelsea and Meatpacking bars.");
  }

  // Spring outdoor activation: April–May
  if (month >= 4 && month <= 5) {
    events.push("Spring is NYC's golden outdoor season — rooftop bars opening, High Line walking weather, Brooklyn Flea at Dumbo every weekend.");
  }

  // Fall foliage + cozy season: September–November
  if (month >= 9 && month <= 11) {
    events.push("Fall in NYC: Central Park foliage is peak, cozy wine bar weather, and speakeasy season is back.");
  }

  // Weekend-specific
  if (isWeekend) {
    events.push("Brooklyn Flea and Smorgasburg are running this weekend (check their schedule). Perfect pre-drink activity before a night out.");
  }

  // Friday evening
  if (dow === 5) {
    events.push("Friday happy hour: The city opens up around 5-7 PM. Best bars in FiDi, Midtown, and the Meatpacking District are packed with after-work energy.");
  }

  return events;
}

// ─── Weather narrative ────────────────────────────────────────────────────────

function getWeatherNarrative(weather: WeatherData): string {
  const { temp, description, isGoodWeather, windSpeed, humidity } = weather.current;
  const pop = weather.forecast[0]?.pop ?? 0;
  const rainPct = Math.round(pop * 100);

  if (isGoodWeather && temp >= 72) {
    return `${temp}°F and ${description} — one of those NYC perfect evenings. Outdoor spots, rooftops, and park adjacents are the call.`;
  }
  if (isGoodWeather && temp >= 60) {
    return `${temp}°F, ${description} — great evening for a walk between spots or a sidewalk table at a West Village bistro.`;
  }
  if (pop >= 0.6 || /rain|drizzle|storm/.test(description)) {
    return `${temp}°F with ${description} (${rainPct}% rain chance) — lean into cozy: wine bars, speakeasies, and ramen spots. The rain actually thins out the crowds at good indoor spots.`;
  }
  if (temp < 45) {
    return `${temp}°F and cold — fireplace bars, hot sake spots, and cozy Italian trattorias are the move. Avoid anything with rooftop-only seating.`;
  }
  return `${temp}°F, ${description} — standard NYC evening. All types of venues are accessible.`;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function getNYCContext(weather: WeatherData): NYCContext {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hour = now.getHours();
  const dow = now.getDay();
  const isWeekend = dow === 0 || dow === 5 || dow === 6;

  const timeBlock =
    hour < 12 ? 'morning' :
    hour < 17 ? 'afternoon' :
    hour < 21 ? 'evening' :
    'night';

  const sportsContext = getSportsContext(month, day, dow);
  const cityEvents = getCityEvents(month, day, dow, isWeekend);
  const weatherNarrative = getWeatherNarrative(weather);

  const dateLabel = `${format(now, 'EEEE, MMMM d, yyyy')} — ${timeBlock} in NYC`;

  const allEvents = [...sportsContext, ...cityEvents];
  const eventsBullets = allEvents.length > 0
    ? allEvents.map(e => `• ${e}`).join('\n')
    : '• No major events detected — normal city energy.';

  const fullPromptContext = `
CURRENT NYC CONTEXT (${dateLabel}):

WEATHER: ${weatherNarrative}

WHAT'S HAPPENING IN THE CITY RIGHT NOW:
${eventsBullets}

CITY ENERGY: It's ${isWeekend ? 'a weekend' : 'a weekday'} ${timeBlock}. ${
    isWeekend && timeBlock === 'evening'
      ? 'Weekend night energy — people are out and looking to commit to a plan.'
      : isWeekend && timeBlock === 'morning'
      ? 'Weekend morning — brunch culture is in full effect. Mimosas and eggs rule.'
      : !isWeekend && timeBlock === 'evening'
      ? 'After-work crowd is hitting the streets. First-round drinks and happy hour deals are active.'
      : 'City is moving at its normal pace.'
  }
`.trim();

  return { dateLabel, timeBlock, isWeekend, sportsContext, cityEvents, weatherNarrative, fullPromptContext };
}
