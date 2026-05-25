import Anthropic from '@anthropic-ai/sdk';
import { WeatherData, ActivityType, VibeTag } from '../types';
import { activityColors, activityIcons } from '../theme';
import { format } from 'date-fns';
import { getNYCContext } from './nycContextService';

export interface PlanRec {
  id: string;
  title: string;        // "Drinks at Westlight"
  hook: string;         // "74° and clear — rooftop weather"
  activityType: ActivityType;
  vibes: VibeTag[];
  icon: string;         // Ionicons name
  gradient: [string, string];
  venueName?: string;   // "Westlight"
  neighborhood?: string; // "Williamsburg"
}

// ─── Time-of-day helper ────────────────────────────────────────────────────

function timeBlock(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 21) return 'evening';
  return 'night';
}

// ─── Rule-based fallback recs (no API key needed) ─────────────────────────

function buildFallbackRecs(weather: WeatherData): PlanRec[] {
  const nycCtx = getNYCContext(weather);
  const temp = weather.current.temp;
  const desc = weather.current.description;
  const pop = weather.forecast[0]?.pop ?? 0;
  const isGood = weather.current.isGoodWeather;
  const isWarm = temp >= 68;
  const isRainy = pop >= 0.5 || /rain|drizzle/.test(desc);
  const isCold = temp < 50;
  const dow = new Date().getDay(); // 0=Sun, 6=Sat
  const isWeekend = dow === 0 || dow === 5 || dow === 6;
  const tb = timeBlock();

  const recs: PlanRec[] = [];

  if (isGood && isWarm) {
    recs.push({
      id: 'r_rooftop',
      title: 'Drinks at Westlight',
      hook: `${temp}° and ${desc} — Williamsburg rooftop is calling`,
      activityType: 'drinks',
      vibes: ['rooftop', 'outdoor'],
      icon: activityIcons['drinks'],
      gradient: activityColors['drinks'],
      venueName: 'Westlight',
      neighborhood: 'Williamsburg',
    });
  }

  if (isRainy || isCold) {
    recs.push({
      id: 'r_cozy',
      title: 'Coffee at Gregorys',
      hook: `${temp}° with ${desc} — warm up at Gregorys`,
      activityType: 'coffee',
      vibes: ['casual', 'intimate'],
      icon: activityIcons['coffee'],
      gradient: activityColors['coffee'],
      venueName: 'Gregorys Coffee',
      neighborhood: 'Midtown',
    });
    recs.push({
      id: 'r_dinner_cozy',
      title: 'Dinner at Via Carota',
      hook: `West Village institution — skip the weather, find the warmth`,
      activityType: 'dinner',
      vibes: ['intimate', 'classic'],
      icon: activityIcons['dinner'],
      gradient: activityColors['dinner'],
      venueName: 'Via Carota',
      neighborhood: 'West Village',
    });
  } else {
    recs.push({
      id: 'r_dinner',
      title: isWeekend ? 'Dinner at Don Angie' : 'Dinner at Don Angie',
      hook: `${isWeekend ? 'Weekend energy — ' : ''}pinwheel lasagna, no reservation needed`,
      activityType: 'dinner',
      vibes: ['lively', 'trendy'],
      icon: activityIcons['dinner'],
      gradient: activityColors['dinner'],
      venueName: 'Don Angie',
      neighborhood: 'West Village',
    });
  }

  if (tb === 'morning' || (tb === 'afternoon' && isWeekend)) {
    recs.push({
      id: 'r_brunch',
      title: "Brunch at Jack's Wife Freda",
      hook: `${temp}° — the SoHo classic has your table`,
      activityType: 'dinner',
      vibes: ['brunch_spot', isGood ? 'outdoor' : 'casual'],
      icon: 'sunny-outline',
      gradient: ['#FF3D6B', '#FF8C6B'] as [string, string],
      venueName: "Jack's Wife Freda",
      neighborhood: 'SoHo',
    });
  }

  if (isGood && (tb === 'afternoon' || tb === 'evening')) {
    recs.push({
      id: 'r_activity',
      title: 'High Line + drinks after',
      hook: `${temp}° and ${desc} — walk the High Line, hit Chelsea after`,
      activityType: 'activity',
      vibes: ['outdoor', 'casual'],
      icon: activityIcons['activity'],
      gradient: activityColors['activity'],
      venueName: 'The High Line',
      neighborhood: 'Chelsea',
    });
  }

  // Sports rec — elevated if there's a real event happening (NBA Playoffs, etc.)
  const hasMajorSportsEvent = nycCtx.sportsContext.length > 0;
  recs.push({
    id: 'r_sports',
    title: hasMajorSportsEvent ? 'Knicks watch party at Nevada Smiths' : 'Game day at Standings',
    hook: hasMajorSportsEvent
      ? `Knicks playoff run is real — Nevada Smiths is the city's best reaction spot`
      : `Best sports bar in the East Village — cold beer, loud crowd`,
    activityType: 'watch_sports',
    vibes: ['game_day', 'lively'],
    icon: activityIcons['watch_sports'],
    gradient: activityColors['watch_sports'],
    venueName: hasMajorSportsEvent ? 'Nevada Smiths' : 'Standings',
    neighborhood: hasMajorSportsEvent ? 'Union Square' : 'East Village',
  });

  if (!isRainy && tb === 'evening') {
    recs.push({
      id: 'r_happy_hour',
      title: 'Happy hour at The Dead Rabbit',
      hook: `FiDi after-work cocktails — worth the trip downtown`,
      activityType: 'drinks',
      vibes: ['happy_hour', 'classic'],
      icon: activityIcons['drinks'],
      gradient: ['#C44D56', '#FF6B35'] as [string, string],
      venueName: 'The Dead Rabbit',
      neighborhood: 'Financial District',
    });
  }

  // Additional always-on recs to pad to 8
  const alwaysOn: PlanRec[] = [
    {
      id: 'r_wine',
      title: 'Wine at June Wine Bar',
      hook: 'Cobble Hill natural wine den — low-key perfect evening',
      activityType: 'drinks',
      vibes: ['intimate', 'hidden_gem'],
      icon: activityIcons['drinks'],
      gradient: activityColors['drinks'],
      venueName: 'June Wine Bar',
      neighborhood: 'Cobble Hill',
    },
    {
      id: 'r_speakeasy',
      title: 'Cocktails at Attaboy',
      hook: 'No menu, just tell them what you like — LES at its best',
      activityType: 'drinks',
      vibes: ['intimate', 'upscale'],
      icon: activityIcons['drinks'],
      gradient: activityColors['drinks'],
      venueName: 'Attaboy',
      neighborhood: 'Lower East Side',
    },
    {
      id: 'r_pasta',
      title: 'Dinner at Lilia',
      hook: 'Mafaldini with pink peppercorns — worth every minute of the wait',
      activityType: 'dinner',
      vibes: ['upscale', 'trendy'],
      icon: activityIcons['dinner'],
      gradient: activityColors['dinner'],
      venueName: 'Lilia',
      neighborhood: 'Williamsburg',
    },
    {
      id: 'r_park',
      title: 'Sunset at Brooklyn Bridge Park',
      hook: 'Best Manhattan skyline view — bring a blanket and a bottle',
      activityType: 'activity',
      vibes: ['outdoor', 'waterfront'],
      icon: activityIcons['activity'],
      gradient: activityColors['activity'],
      venueName: 'Brooklyn Bridge Park',
      neighborhood: 'DUMBO',
    },
  ];

  for (const ar of alwaysOn) {
    if (recs.length >= 8) break;
    if (!recs.find(r => r.venueName === ar.venueName)) recs.push(ar);
  }

  // Ensure at least 8
  while (recs.length < 8) {
    recs.push({
      id: `r_fallback_${recs.length}`,
      title: 'Wander the High Line',
      hook: 'Chelsea on foot — see where it takes you',
      activityType: 'activity',
      vibes: ['outdoor', 'casual'],
      icon: activityIcons['activity'],
      gradient: activityColors['activity'],
      venueName: 'The High Line',
      neighborhood: 'Chelsea',
    });
  }

  return recs.slice(0, 8);
}

// ─── Claude-powered recs ───────────────────────────────────────────────────

export async function generateDailyRecs(weather: WeatherData): Promise<PlanRec[]> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
    return buildFallbackRecs(weather);
  }

  const client = new Anthropic({ apiKey });
  const now = new Date();
  const dow = format(now, 'EEEE');
  const tb = timeBlock();
  const temp = weather.current.temp;
  const desc = weather.current.description;
  const pop = weather.forecast[0]?.pop ?? 0;
  const rainPct = Math.round(pop * 100);
  const isWeekend = now.getDay() === 0 || now.getDay() === 5 || now.getDay() === 6;

  const validTypes: ActivityType[] = ['drinks', 'dinner', 'coffee', 'activity', 'whatever', 'sports', 'watch_sports'];
  const validVibes: VibeTag[] = [
    'outdoor', 'rooftop', 'casual', 'upscale', 'hidden_gem',
    'lively', 'intimate', 'trendy', 'classic', 'waterfront',
    'happy_hour', 'live_music', 'trivia_night', 'game_day', 'brunch_spot', 'date_night',
  ];

  // Get real-time NYC context (sports, events, seasonal, time-of-day)
  const nycCtx = getNYCContext(weather);

  const prompt = `You are the Whim AI — a deeply plugged-in New Yorker who always knows exactly what's happening in the city right now.

${nycCtx.fullPromptContext}

Generate exactly 8 spontaneous plan ideas tailored to TONIGHT IN NYC. Name REAL, SPECIFIC venues. The title must be venue-specific: "Game 6 watch party at Nevada Smiths" or "Rooftop drinks at Westlight" or "Ramen at Ivan Ramen" — not generic categories.

Real NYC venues by type (pick contextually appropriate ones):
- drinks/rooftop: Westlight (Williamsburg), 230 Fifth, Bar 54, The Press Lounge, Harriet's at 1 Hotel Brooklyn
- cocktail/speakeasy: Death & Co (East Village), Attaboy, Amor y Amargo, Little Branch
- wine bar: June Wine Bar (Cobble Hill), Terroir, Pips (Williamsburg)
- dive bar: Rudy's (Hell's Kitchen), Milano's, International Bar
- sports bar: Standings (East Village), Nevada Smiths (Union Square), The Ainsworth
- dinner: Via Carota, Don Angie, Lilia, Lucali, Uncle Boons, Carbone, Katz's, Ivan Ramen
- brunch: Jack's Wife Freda, Bubby's, The Dutch, Egg Shop, Winner (Brooklyn)
- coffee: Think Coffee, Joe Coffee, La Colombe, Gregorys
- activity: High Line, Brooklyn Bridge Park, Smorgasburg, Brooklyn Boulders

CRITICAL RULES:
1. If any major sports event is happening (NBA Finals, Knicks game, Yankees, etc.) — include at least one sports watch-party rec at a named bar
2. Mix activity types — max one per activityType
3. If nice out (${temp > 65 && pop < 0.3 ? 'YES it is' : 'not ideal'}): include at least one outdoor/rooftop
4. If rain/cold: prioritize cozy indoor spots — mention the weather as a selling point
5. Time is ${tb} — ${tb === 'morning' || tb === 'afternoon' ? 'include daytime options (brunch/coffee)' : 'focus on evening/night plans'}
6. Hook = how a New Yorker would text a friend about it — mention city energy, current events, or weather naturally

Return ONLY a JSON array (no extra text, no markdown):
[
  {
    "id": "rec_1",
    "title": "venue-specific plan name",
    "hook": "1 sentence, max 14 words, friend-text energy, may reference city events",
    "activityType": one of ${JSON.stringify(validTypes)},
    "vibes": array of 1-3 from ${JSON.stringify(validVibes)},
    "venueName": "just the venue name",
    "neighborhood": "NYC neighborhood"
  }
]`;

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';
    // Strip any markdown code fences if present
    const json = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    const raw: {
      id: string;
      title: string;
      hook: string;
      activityType: ActivityType;
      vibes: VibeTag[];
      venueName?: string;
      neighborhood?: string;
    }[] = JSON.parse(json);

    return raw.map(r => ({
      ...r,
      icon: activityIcons[r.activityType] ?? 'flash-outline',
      gradient: (activityColors[r.activityType] ?? ['#FF6B35', '#FF9A56']) as [string, string],
    }));
  } catch {
    return buildFallbackRecs(weather);
  }
}
