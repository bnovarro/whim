// AI agent service using the Anthropic SDK.
// In production, these calls should go through your backend to protect the API key.
// For the prototype, calls are made directly with EXPO_PUBLIC_ANTHROPIC_API_KEY.
import Anthropic from '@anthropic-ai/sdk';
import { WhimParams, Venue, TripItinerary, FlightDeal, WeatherData } from '../types';
import { getMockVenues } from './venueService';
import { vibeLabels, cuisineLabels, drinkTypeLabels } from '../theme';
import { getNYCContext } from './nycContextService';
import { format } from 'date-fns';

const getClient = () =>
  new Anthropic({ apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '' });

// ─── Helpers ────────────────────────────────────────────────────────────────

function weatherSummary(weather: WeatherData | null): string {
  if (!weather) return 'weather unknown';
  const c = weather.current;
  const popNote = (() => {
    const todayForecast = weather.forecast[0];
    if (!todayForecast) return '';
    const pop = todayForecast.pop ?? 0;
    if (pop >= 0.6) return `, ${Math.round(pop * 100)}% chance of rain tonight`;
    if (pop >= 0.3) return ', slight chance of rain later';
    return '';
  })();
  return `${c.temp}°F, ${c.description} (feels like ${c.feelsLike}°F), humidity ${c.humidity}%${popNote}`;
}

function planDateLabel(whimDate?: string): string {
  if (!whimDate) return 'tonight';
  const today = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');
  if (whimDate === today) return 'tonight';
  if (whimDate === tomorrow) return 'tomorrow';
  try {
    return format(new Date(whimDate + 'T12:00:00'), 'EEEE, MMMM d');
  } catch {
    return whimDate;
  }
}

function dayOfWeekLabel(whimDate?: string): string {
  const date = whimDate ? new Date(whimDate + 'T12:00:00') : new Date();
  return format(date, 'EEEE');
}

// ─── Venue ranking ──────────────────────────────────────────────────────────

export async function rankVenuesWithAI(
  params: WhimParams,
  rawVenues: Venue[],
  weather: WeatherData | null = null
): Promise<Venue[]> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) return rankVenuesMock(params, rawVenues);

  const client = getClient();
  const vibeList = params.vibes.map(v => vibeLabels[v]).join(', ') || 'no specific vibe preference';
  const whenLabel = planDateLabel(params.whimDate);
  const dowLabel = dayOfWeekLabel(params.whimDate);
  const wx = weatherSummary(weather);
  const isOutdoorVibe = params.vibes.some(v => ['outdoor', 'rooftop', 'waterfront'].includes(v));
  const weatherNote = isOutdoorVibe && weather && !weather.current.isGoodWeather
    ? 'NOTE: The user wants outdoor/rooftop vibes but conditions are marginal — factor this into scores.'
    : '';

  const venuePayload = rawVenues.map(v => ({
    id: v.id,
    name: v.name,
    neighborhood: v.neighborhood,
    distanceMiles: v.distanceMiles,
    tags: v.tags,
    rating: v.rating,
    priceLevel: v.priceLevel,
    isOpenNow: v.isOpenNow,
    activityType: v.activityType,
    availabilityNote: v.availabilityNote || null,
  }));

  const prompt = `You are the Whim AI — a savvy New Yorker who knows the city's best spots and gives real, opinionated recommendations. Your job is to rank and score venues for a spontaneous plans app.

TONIGHT'S PLAN:
• Activity: ${params.activityType === 'watch_sports' ? 'watching sports at a bar' : params.activityType}
• When: ${params.timeStart}–${params.timeEnd}, ${dowLabel} (${whenLabel})
• Vibe: ${vibeList}
• Group: ${params.groupSize} ${params.groupSize === 1 ? 'person' : 'people'}
• Radius: ${params.radiusMiles} miles from their location
• Weather: ${wx}
• User notes: ${params.notes || 'none'}
• Plan name: ${params.planName || 'unnamed'}
${weatherNote}

VENUES TO SCORE:
${JSON.stringify(venuePayload, null, 2)}

SCORING RULES:
- matchScore 0–100. Be opinionated. A truly perfect match = 90+. Decent but not special = 65–80. Wrong vibe or poor fit = below 60.
- Heavily reward venues where the tags, neighborhood, and type directly match the requested vibe
- Penalize venues that are closed (isOpenNow: false) by 20 points
- For outdoor/rooftop vibes on a bad-weather night, score those venues 15 pts lower
- For late-night requests (9pm+), boost venues known for late energy; penalize spots that close early
- A closer venue beats a far one if everything else is equal
- isAlternative: true only for wildcards — venues outside the core ask that could surprise them (max 1–2)

For each venue return:
{
  "id": "...",
  "matchScore": 85,
  "matchExplanation": "1–2 punchy sentences that sound like advice from a friend who knows NYC — mention something specific about why this spot works for this exact plan",
  "isAlternative": false,
  "alternativeNote": null
}

Return ONLY a valid JSON array, no extra text.`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const scores: {
      id: string;
      matchScore: number;
      matchExplanation: string;
      isAlternative: boolean;
      alternativeNote?: string | null;
    }[] = JSON.parse(text);

    const scoreMap = new Map(scores.map(s => [s.id, s]));
    return rawVenues
      .map(v => {
        const score = scoreMap.get(v.id);
        if (!score) return v;
        return {
          ...v,
          matchScore: score.matchScore,
          matchExplanation: score.matchExplanation,
          isAlternative: score.isAlternative,
          alternativeNote: score.alternativeNote ?? undefined,
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  } catch {
    return rankVenuesMock(params, rawVenues);
  }
}

function rankVenuesMock(params: WhimParams, venues: Venue[]): Venue[] {
  return getMockVenues(params);
}

// ─── AI-generated venue discovery ───────────────────────────────────────────
// Replaces the static pool + rank two-step.
// Claude generates real NYC venues tailored to the exact request.

export async function generateVenuesWithAI(
  params: WhimParams,
  weather: WeatherData | null = null
): Promise<Venue[]> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
    return getMockVenues(params);
  }

  const client = getClient();
  const wx = weatherSummary(weather);
  const whenLabel = planDateLabel(params.whimDate);
  const dowLabel = dayOfWeekLabel(params.whimDate);
  const vibeList = params.vibes.map(v => vibeLabels[v]).join(', ') || 'no preference';
  const nycCtx = weather ? getNYCContext(weather) : null;

  const activityLabel: Record<string, string> = {
    drinks: 'drinks / bar',
    dinner: 'dinner at a restaurant',
    coffee: 'coffee or a café',
    activity: 'an activity or experience',
    whatever: 'anything good — open to any type',
    sports: 'live sports event / arena',
    watch_sports: 'watching sports at a bar',
  };

  const hasCuisine = params.activityType === 'dinner' && !!params.cuisine;
  const hasBarType = params.activityType === 'drinks' && !!params.barType;

  const subcategoryLine = hasCuisine
    ? `\n• Cuisine: **${cuisineLabels[params.cuisine!] ?? params.cuisine}** — REQUIRED, every venue must serve this cuisine`
    : hasBarType
    ? `\n• Bar type: **${drinkTypeLabels[params.barType!] ?? params.barType}** — REQUIRED, every venue must match this bar type`
    : '';

  const centerDescription = params.pinLat && params.pinLon
    ? `centered at (${params.pinLat.toFixed(4)}, ${params.pinLon.toFixed(4)})`
    : 'in NYC';

  const neighborhoodLine = params.neighborhood
    ? `\n• Preferred area: ${params.neighborhood} (prioritize this but include 2–3 nearby options within radius)`
    : '\n• No neighborhood preference — spread across Manhattan and Brooklyn within radius';

  const notesLine = params.notes ? `\n• User notes: "${params.notes}"` : '';
  const nycContextLine = nycCtx?.fullPromptContext ? `\n\n${nycCtx.fullPromptContext}` : '';

  const cuisineConstraint = hasCuisine
    ? `\n⚠️ HARD CONSTRAINT: Activity is dinner and cuisine is "${cuisineLabels[params.cuisine!] ?? params.cuisine}". You MUST only return restaurants that serve this cuisine. Do NOT include any restaurant that primarily serves a different cuisine.`
    : hasBarType
    ? `\n⚠️ HARD CONSTRAINT: Bar type is "${drinkTypeLabels[params.barType!] ?? params.barType}". You MUST only return bars that match this type.`
    : '';

  const prompt = `You are the Whim AI — a deeply plugged-in New Yorker who knows every worthwhile spot in the city. A user is planning a spontaneous outing and needs real venue recommendations.

THEIR REQUEST:
• Activity: ${activityLabel[params.activityType] ?? params.activityType}${subcategoryLine}
• When: ${whenLabel}, ${dowLabel}, ${params.timeStart}${params.timeEnd ? `–${params.timeEnd}` : ''}
• Vibe: ${vibeList}
• Group size: ${params.groupSize} ${params.groupSize === 1 ? 'person' : 'people'}
• Search radius: ${params.radiusMiles} miles ${centerDescription}
• Weather: ${wx}${neighborhoodLine}${notesLine}${nycContextLine}${cuisineConstraint}

⚠️ RADIUS IS MANDATORY: Every venue's distanceMiles MUST be ≤ ${params.radiusMiles}. If you know a venue is farther, do not include it or set distanceMiles accurately. NYC blocks are ~0.05 miles, so ${params.radiusMiles} miles = roughly ${Math.round(params.radiusMiles / 0.05)} blocks from the center point.

Generate 10–12 REAL NYC venues that exist right now and would genuinely fit this request. Rules:
1. Name actual, real places — no fictional venues
2. Every venue MUST be within ${params.radiusMiles} miles of the center — set distanceMiles accurately, not as a placeholder
3. Vary neighborhoods within the radius (Manhattan + Brooklyn if radius allows)
4. Vary price levels ($$, $$$, $$$$) so user has options at different budgets
5. Vary the specific sub-vibe within the category (e.g. for drinks: rooftop, speakeasy, dive, wine bar)
6. matchScore 0–100: be opinionated. A true bullseye = 90+. Good but not perfect = 72–88. Wildcard = 60–70.
7. Mark isAlternative: true for 1–2 wildcards that are a fun surprise outside the obvious ask
8. matchExplanation = 1–2 punchy sentences a knowledgeable NYC friend would text — reference the specific vibe, day, or weather if relevant
9. Accuracy matters: only include availabilityNote if you're confident about it (walk-in vs reservation, BYOB, cash-only, etc.)
10. bookingPlatform: "resy" | "opentable" | "website" | null — only set if you know this venue actually uses that platform
11. If tonight has a major sports event (from context above), include at least one sports-bar option even if the activity isn't watch_sports

Return ONLY valid JSON, no markdown, no extra text:
[
  {
    "id": "v_ai_1",
    "name": "Venue Name",
    "address": "123 Street Name, Neighborhood, NY",
    "neighborhood": "Neighborhood",
    "distanceMiles": 1.4,
    "rating": 4.6,
    "priceLevel": 3,
    "tags": ["tag1", "tag2", "tag3"],
    "isOpenNow": true,
    "availabilityNote": "Walk-ins only after 8pm",
    "bookingUrl": "https://resy.com/...",
    "bookingPlatform": "resy",
    "matchScore": 92,
    "matchExplanation": "Why this spot nails this exact plan.",
    "isAlternative": false,
    "alternativeNote": null
  }
]`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 3500,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
    const json = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const parsed: Array<Record<string, unknown>> = JSON.parse(json);

    const venues: Venue[] = parsed.map((v, i) => ({
      id: typeof v.id === 'string' ? v.id : `v_ai_${i + 1}`,
      name: String(v.name ?? 'Venue'),
      address: String(v.address ?? ''),
      neighborhood: String(v.neighborhood ?? 'Manhattan'),
      distanceMiles: typeof v.distanceMiles === 'number' ? v.distanceMiles : 1.5,
      rating: typeof v.rating === 'number' ? Math.min(5, Math.max(1, v.rating)) : 4.3,
      priceLevel: ([1, 2, 3, 4].includes(Number(v.priceLevel)) ? Number(v.priceLevel) : 2) as 1 | 2 | 3 | 4,
      photos: [],
      tags: Array.isArray(v.tags) ? (v.tags as string[]) : [],
      isOpenNow: v.isOpenNow !== false,
      availabilityNote: typeof v.availabilityNote === 'string' ? v.availabilityNote : undefined,
      bookingUrl: typeof v.bookingUrl === 'string' ? v.bookingUrl : undefined,
      bookingPlatform: (['resy', 'opentable', 'website'].includes(String(v.bookingPlatform ?? ''))
        ? v.bookingPlatform as 'resy' | 'opentable' | 'website'
        : undefined),
      activityType: params.activityType,
      matchScore: typeof v.matchScore === 'number' ? Math.min(100, Math.max(0, v.matchScore)) : 80,
      matchExplanation: String(v.matchExplanation ?? ''),
      isAlternative: v.isAlternative === true,
      alternativeNote: typeof v.alternativeNote === 'string' ? v.alternativeNote : undefined,
    }));

    // Post-process: enforce radius — keep venues within 120% of the requested radius
    // (small buffer for measurement imprecision, but nothing obviously out-of-range)
    const radiusCap = params.radiusMiles * 1.2;
    const inRange = venues.filter(v => v.distanceMiles <= radiusCap);
    // If AI returned too few in-range venues, fall back to all (better than empty list)
    const filtered = inRange.length >= 3 ? inRange : venues;

    // Post-process: enforce cuisine — if user specified one, remove venues with wrong tags
    let finalVenues = filtered;
    if (hasCuisine && params.cuisine) {
      const cuisineKey = params.cuisine.toLowerCase();
      const cuisineLabel = (cuisineLabels[params.cuisine] ?? params.cuisine).toLowerCase();
      const cuisineFiltered = filtered.filter(v => {
        const tagText = v.tags.join(' ').toLowerCase();
        const nameText = v.name.toLowerCase();
        const addressText = v.address.toLowerCase();
        return (
          tagText.includes(cuisineKey) ||
          tagText.includes(cuisineLabel) ||
          nameText.includes(cuisineLabel) ||
          addressText.includes(cuisineLabel)
        );
      });
      // Only apply filter if it doesn't wipe out the list
      if (cuisineFiltered.length >= 3) finalVenues = cuisineFiltered;
    }

    return finalVenues.sort((a, b) => b.matchScore - a.matchScore);
  } catch {
    // Fall back to static pool with AI ranking
    const raw = getMockVenues(params);
    return rankVenuesWithAI(params, raw, weather);
  }
}

// ─── Trip itinerary generation ──────────────────────────────────────────────

export async function generateItinerary(deal: FlightDeal): Promise<TripItinerary> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey || deal.itinerary) {
    return deal.itinerary || getMockItinerary(deal);
  }

  const client = getClient();

  const prompt = `Generate a compelling, opinionated 3-day trip itinerary for ${deal.destination.city}, ${deal.destination.country}.

This is for a spontaneous traveler from NYC who just found a cheap flight and needs to be sold on why this trip is worth taking. The tone should feel like a well-traveled friend giving real advice — not a guidebook. Be specific, name actual places, give real opinions.

Known highlights: ${deal.destination.highlights.join(', ')}

Return a JSON object matching this TypeScript interface exactly:
{
  intro: string; // 2-3 punchy sentences — sell the destination like you love it
  days: Array<{
    day: number;
    title: string; // catchy day title
    activities: Array<{
      time: string; // "Morning", "Afternoon", "Evening", or specific time
      name: string; // actual venue/place/activity name
      description: string; // 1-2 sentences of real, specific advice
      type: "food" | "activity" | "neighborhood" | "transport"
    }>
  }>; // exactly 3 days
  hiddenGems: string[]; // 4 items, format: "Actual Place Name — why it's worth it in one line"
  neighborhoods: string[]; // 4-5 key neighborhoods to know
  bestTimeToGo: string; // honest, specific seasonal advice
  localTips: string[]; // 4 practical tips that only locals know
}

Return ONLY valid JSON, no other text.`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    return JSON.parse(text) as TripItinerary;
  } catch {
    return getMockItinerary(deal);
  }
}

function getMockItinerary(deal: FlightDeal): TripItinerary {
  return {
    intro: `${deal.destination.city} is one of those places that catches you off guard. You think you know what to expect and you don't. Go find out.`,
    days: [
      {
        day: 1,
        title: 'Land, Walk, Eat',
        activities: [
          { time: 'Afternoon', name: 'Explore the main neighborhood', description: 'Walk before you plan. Get a feel for the city on foot before committing to anything.', type: 'neighborhood' },
          { time: 'Evening', name: 'Local market or food hall', description: 'Find the nearest market. Buy something you can\'t identify. Eat it.', type: 'food' },
          { time: 'Night', name: 'Dinner somewhere the hotel wouldn\'t recommend', description: 'Ask a local. Avoid anywhere with photos on the menu or a host outside beckoning you in.', type: 'food' },
        ],
      },
      {
        day: 2,
        title: 'Go Deeper',
        activities: [
          { time: 'Morning', name: deal.destination.highlights[0] || 'Cultural landmark', description: 'The must-do you\'d regret skipping. Go early before the crowds.', type: 'activity' },
          { time: 'Afternoon', name: 'Wander a residential neighborhood', description: 'Get genuinely lost. This is the whole point. No map for two hours.', type: 'neighborhood' },
          { time: 'Evening', name: 'Find the locals\' bar', description: 'Not the tourist strip — the place with regulars who\'ve been coming for years.', type: 'food' },
        ],
      },
      {
        day: 3,
        title: 'Last Day Energy',
        activities: [
          { time: 'Morning', name: deal.destination.highlights[1] || 'Second landmark', description: 'The thing you almost skipped. Glad you didn\'t.', type: 'activity' },
          { time: 'Afternoon', name: 'Slow café afternoon', description: 'Order something and stay too long. Travel is also this.', type: 'food' },
          { time: 'Evening', name: 'One last proper meal', description: 'Go back to the place from night one if it was good. If not, you know where to look now.', type: 'food' },
        ],
      },
    ],
    hiddenGems: deal.destination.highlights.map(h => `${h} — worth more than the guidebook makes it sound`),
    neighborhoods: deal.destination.highlights.slice(0, 4),
    bestTimeToGo: `${deal.destination.city} has its moments year-round. Check the weather and go when the price is right — that's the whole point.`,
    localTips: [
      'Learn five words in the local language. People actually notice.',
      'The best meals are rarely in the most-photographed blocks.',
      'Walk more than you think you need to. That\'s where the good stuff is.',
      'Give yourself one completely unplanned afternoon with no agenda.',
    ],
  };
}

// ─── Whim search message ────────────────────────────────────────────────────

export async function generateWhimSuggestion(
  params: WhimParams,
  weather: WeatherData | null = null
): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) {
    return `Looking for the best ${params.activityType} spots near you…`;
  }

  const client = getClient();
  const vibeList = params.vibes.map(v => vibeLabels[v]).join(', ');
  const wx = weather ? `${weather.current.temp}°F and ${weather.current.description}` : null;
  const weatherClause = wx ? ` It's ${wx} right now.` : '';
  const whenLabel = planDateLabel(params.whimDate);

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 80,
      messages: [{
        role: 'user',
        content: `Write one short, enthusiastic message (max 12 words) for a NYC spontaneous plans app. The user wants ${params.activityType} ${whenLabel}.${weatherClause} Vibe: ${vibeList || 'open'}. Sound like an excited NYC friend, not a bot. No quotes.`,
      }],
    });
    return message.content[0].type === 'text'
      ? message.content[0].text.trim().replace(/^["']|["']$/g, '')
      : `Hunting down the best ${params.activityType} spots…`;
  } catch {
    return `Hunting down the best ${params.activityType} spots for ${whenLabel}…`;
  }
}
