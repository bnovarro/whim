export type ActivityType = 'drinks' | 'dinner' | 'coffee' | 'activity' | 'whatever' | 'sports' | 'watch_sports';

export type SportType =
  | 'basketball' | 'pickleball' | 'tennis' | 'golf'
  | 'bowling' | 'hiking' | 'cycling' | 'yoga' | 'running'
  | 'rock_climbing' | 'soccer' | 'ping_pong' | 'volleyball';

export type FoodCuisine =
  | 'italian' | 'japanese' | 'mexican' | 'american' | 'mediterranean'
  | 'thai' | 'chinese' | 'korean' | 'indian' | 'french'
  | 'pizza' | 'sushi' | 'steakhouse' | 'brunch' | 'caribbean';

export type DrinkVenueType =
  | 'cocktail_bar' | 'wine_bar' | 'rooftop_bar' | 'dive_bar' | 'sports_bar'
  | 'speakeasy' | 'beer_garden' | 'whiskey_bar';

export type PlanType = 'open' | 'exclusive_date' | 'group_hangout';
export type PlanVisibility = 'public' | 'friends' | 'specific';

export interface InterestedUser {
  userId: string;
  name: string;
  instagram?: string;
  /** 'user_declined' = invitee said they're unavailable (only creator sees) */
  status: 'pending' | 'accepted' | 'declined' | 'user_declined';
  requestedAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
}

export type VibeTag =
  | 'outdoor' | 'rooftop' | 'casual' | 'upscale' | 'hidden_gem'
  | 'lively' | 'intimate' | 'trendy' | 'classic' | 'waterfront'
  | 'happy_hour' | 'live_music' | 'trivia_night' | 'game_day' | 'brunch_spot' | 'date_night';

export type AvailabilityVisibility = 'public' | 'friends' | 'private';
export type DayAvailability = 'free' | 'busy' | 'unknown';

export interface User {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  photo?: string;       // profile photo URL
  photos?: string[];    // up to 6 gallery photos
  instagram?: string;   // handle without @
  beli?: string;        // Beli app handle
  spotify?: string;     // Spotify profile handle or URL
  bio?: string;
  phone?: string;
  city: string;
  homeAddress?: string;
  friends: string[];
  pushToken?: string;
  favorites?: string[]; // favorited venue/plan IDs
  prompts?: Record<string, string>; // e.g. { "Favorite restaurant?": "Via Carota" }
  /** Who can see this user's "available/busy" status today */
  availabilityVisibility?: AvailabilityVisibility;
}

export interface PublicPlan {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorPhoto?: string;
  creatorInstagram?: string;
  /** Creator's availability visibility setting (snapshot at fetch time) */
  creatorAvailabilityVisibility?: AvailabilityVisibility;
  planType: PlanType;
  visibility: PlanVisibility;
  activityType: ActivityType;
  cuisine?: FoodCuisine;
  barType?: DrinkVenueType;
  sportType?: SportType;
  /** Specific venue/spot chosen by creator (overrides AI venue search) */
  specificSpot?: string;
  planName: string;
  description?: string;
  neighborhood: string;
  date: string; // ISO date e.g. '2026-05-24'
  timeStart: string; // e.g. '8:00 PM'
  vibes: VibeTag[];
  groupSize: number;
  attendeeCount: number;
  maxAttendees?: number;
  interestedUsers: InterestedUser[];
  isJoined: boolean;
  hasExpressedInterest: boolean;
  createdAt: string;
}

export interface WhimParams {
  activityType: ActivityType;
  cuisine?: FoodCuisine;      // for dinner plans
  barType?: DrinkVenueType;   // for drinks plans
  sportType?: SportType;       // for activity/sports plans
  specificSpot?: string;       // user-chosen venue name (AI uses as hint or skips search)
  /** Second person's neighborhood for "split the distance" meet-in-the-middle search */
  splitNeighborhood?: string;
  timeStart: string;
  timeEnd: string;
  radiusMiles: number;
  vibes: VibeTag[];
  groupSize: number;
  notes?: string;
  planName?: string;
  pinLat?: number;
  pinLon?: number;
  neighborhood?: string;
  whimDate?: string; // ISO date string e.g. '2026-05-24'
}

export type WhimStatus =
  | 'drafting'
  | 'searching'
  | 'found'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

export interface Attendee {
  userId: string;
  name: string;
  avatar?: string;
  status: 'invited' | 'confirmed' | 'declined';
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  neighborhood: string;
  distanceMiles: number;
  rating: number;
  priceLevel: 1 | 2 | 3 | 4;
  photos: string[];
  tags: string[];
  isOpenNow: boolean;
  availabilityNote?: string;
  bookingUrl?: string;
  bookingPlatform?: 'resy' | 'opentable' | 'website';
  phone?: string;
  activityType: ActivityType;
  matchScore: number;
  matchExplanation: string;
  isAlternative: boolean;
  alternativeNote?: string;
}

export interface Whim {
  id: string;
  creatorId: string;
  creatorName: string;
  params: WhimParams;
  status: WhimStatus;
  attendees: Attendee[];
  venues: Venue[];
  selectedVenueId?: string;
  sportsEvents?: SportsEvent[];
  shareLink: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeatherCondition {
  temp: number;
  feelsLike: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  isGoodWeather: boolean;
}

export interface ForecastDay {
  date: string;
  tempHigh: number;
  tempLow: number;
  description: string;
  icon: string;
  isGoodWeather: boolean;
  pop?: number; // precipitation probability 0–1
  feelsLikeHigh?: number;
}

export interface WeatherData {
  current: WeatherCondition;
  forecast: ForecastDay[];
  city: string;
}

export type WeatherAlertType = 'great_weather' | 'bad_weather' | 'seasonal' | 'escape_nudge';

export interface WeatherAlert {
  id: string;
  type: WeatherAlertType;
  title: string;
  message: string;
  date: string;
  actionType?: 'create_whim' | 'open_escape';
}

export interface DepartureOption {
  date: string;
  returnDate: string;
  price: number;
  airline: string;
  stops: number;
}

export interface FlightDestination {
  city: string;
  country: string;
  code: string;
  description: string;
  imageGradient: [string, string];
  timezone: string;
  highlights: string[];
}

export interface FlightDeal {
  id: string;
  destination: FlightDestination;
  origin: {
    city: string;
    code: string;
  };
  price: number;
  averagePrice: number;
  savingsPercent: number;
  tripLength: {
    min: number;
    max: number;
  };
  departureDates: DepartureOption[];
  bookingUrl: string;
  itinerary?: TripItinerary;
  expiresAt?: string;
  tags: string[];
  whyNow?: string;
}

export interface ItineraryActivity {
  time: string;
  name: string;
  description: string;
  type: 'food' | 'activity' | 'neighborhood' | 'transport';
}

export interface ItineraryDay {
  day: number;
  title: string;
  activities: ItineraryActivity[];
}

export interface TripItinerary {
  intro: string;
  days: ItineraryDay[];
  hiddenGems: string[];
  neighborhoods: string[];
  bestTimeToGo: string;
  localTips: string[];
}

export interface AppNotification {
  id: string;
  type: 'weather_alert' | 'whim_invite' | 'venue_found' | 'friend_joined';
  title: string;
  body: string;
  data?: Record<string, string>;
  createdAt: string;
  read: boolean;
}

export interface SportsEvent {
  id: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  league: string;
  venue: string;
  address: string;
  neighborhood: string;
  datetime: string;
  distanceMiles: number;
  minPrice: number;
  ticketUrl: string;
  platform: 'stubhub' | 'ticketmaster';
}
