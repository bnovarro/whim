import { StyleSheet } from 'react-native';

export const colors = {
  primary: '#FF6B35',
  primaryLight: '#FF9A6B',
  primaryDark: '#E55A25',
  secondary: '#1F0E23',    // deep dusk — used for selected states

  background: '#FFFFFF',   // pure white
  surface: '#FFFFFF',
  surfaceSecondary: '#FFF8F3', // barely-there warm tint

  text: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textTertiary: '#A0A0A0',
  textInverse: '#FFFFFF',

  border: '#EBEBEB',       // clean neutral border
  borderLight: '#F5F5F5',

  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#F59E0B',         // amber — no more blue in palette

  goodWeatherTint: '#FFF8EE', // warm amber tint

  overlay: 'rgba(26, 26, 26, 0.50)',
  overlayLight: 'rgba(26, 26, 26, 0.08)',

  gradients: {
    primary:     ['#FF6B35', '#FF9A56'] as [string, string],
    sunset:      ['#C44D56', '#FF6B35', '#FFC107'] as [string, string, string],
    publicPlans: ['#FF3D6B', '#FF6B35'] as [string, string],
    escape:      ['#FF3D6B', '#C44D56'] as [string, string],   // warm rose-red
    weather:     ['#F59E0B', '#FF8C42'] as [string, string],   // amber
    dark:        ['#1F0E23', '#3D1440'] as [string, string],
    good_weather:['#F59E0B', '#FF8C42'] as [string, string],
    bad_weather: ['#9B7E6B', '#6B4F3A'] as [string, string],   // moody warm taupe
  },
};

export const typography = {
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 28,
    '3xl': 34,
    '4xl': 42,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
};

export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  '2xl': 28,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
};

export const activityColors: Record<string, [string, string]> = {
  drinks:      ['#FF8C42', '#FFAA6B'],   // warm orange
  dinner:      ['#FF3D6B', '#FF8C6B'],   // rose → orange
  coffee:      ['#C07A3D', '#E8A87C'],   // warm brown (keep)
  activity:    ['#F59E0B', '#FFD166'],   // amber → golden
  whatever:    ['#FF9A6B', '#FFC5A3'],   // warm peach
  sports:      ['#E55A25', '#FF6B35'],   // deep orange-red
  watch_sports:['#F59E0B', '#EF4444'],   // amber-red (keep)
};

export const activityIcons: Record<string, string> = {
  drinks: 'wine-outline',
  dinner: 'restaurant-outline',
  coffee: 'cafe-outline',
  activity: 'flash-outline',
  whatever: 'grid-outline',
  sports: 'trophy-outline',
  watch_sports: 'tv-outline',
};

export const vibeLabels: Record<string, string> = {
  outdoor: 'Outdoor',
  rooftop: 'Rooftop',
  casual: 'Casual',
  upscale: 'Upscale',
  hidden_gem: 'Hidden Gem',
  lively: 'Lively',
  intimate: 'Intimate',
  trendy: 'Trendy',
  classic: 'Classic',
  waterfront: 'Waterfront',
  happy_hour: 'Happy Hour',
  live_music: 'Live Music',
  trivia_night: 'Trivia Night',
  game_day: 'Game Day',
  brunch_spot: 'Brunch Spot',
  date_night: 'Date Night',
};

export const cuisineLabels: Record<string, string> = {
  italian: 'Italian', japanese: 'Japanese', mexican: 'Mexican', american: 'American',
  mediterranean: 'Mediterranean', thai: 'Thai', chinese: 'Chinese', korean: 'Korean',
  indian: 'Indian', french: 'French', pizza: 'Pizza', sushi: 'Sushi',
  steakhouse: 'Steakhouse', brunch: 'Brunch', caribbean: 'Caribbean',
};

export const drinkTypeLabels: Record<string, string> = {
  cocktail_bar: 'Cocktail Bar', wine_bar: 'Wine Bar', rooftop_bar: 'Rooftop Bar',
  dive_bar: 'Dive Bar', sports_bar: 'Sports Bar', speakeasy: 'Speakeasy',
  beer_garden: 'Beer Garden', whiskey_bar: 'Whiskey Bar',
};

export const sportTypeLabels: Record<string, string> = {
  basketball:    'Basketball',
  pickleball:    'Pickleball',
  tennis:        'Tennis',
  golf:          'Golf / Range',
  bowling:       'Bowling',
  hiking:        'Hiking',
  cycling:       'Cycling',
  yoga:          'Yoga',
  running:       'Running',
  rock_climbing: 'Rock Climbing',
  soccer:        'Soccer',
  ping_pong:     'Ping Pong',
  volleyball:    'Volleyball',
};

export const sportTypeIcons: Record<string, string> = {
  basketball:    'basketball-outline',
  pickleball:    'tennisball-outline',
  tennis:        'tennisball-outline',
  golf:          'golf-outline',
  bowling:       'disc-outline',
  hiking:        'walk-outline',
  cycling:       'bicycle-outline',
  yoga:          'body-outline',
  running:       'footsteps-outline',
  rock_climbing: 'layers-outline',
  soccer:        'football-outline',
  ping_pong:     'radio-button-on-outline',
  volleyball:    'ellipse-outline',
};

/** Weather + time-of-day background tint for HomeScreen hero */
export function getWeatherBg(
  description: string,
  isGoodWeather: boolean,
  hour: number,
): [string, string] {
  const d = description.toLowerCase();
  if (/rain|drizzle|storm|thunder/.test(d)) return ['#D0D9E8', '#E8ECF5'];
  if (/fog|mist|haze/.test(d))             return ['#D5D9DF', '#E8EAED'];
  if (/snow|sleet|flurr/.test(d))          return ['#D8E8F5', '#EEF5FC'];
  if (/cloud|overcast/.test(d))            return ['#E2E6EC', '#F2F4F8'];
  // Clear / sunny — time-of-day
  if (hour >= 21 || hour < 5)              return ['#EDE8F5', '#F5F2FC']; // night
  if (hour >= 17 && hour < 21)             return ['#FFE4CC', '#FFF3EA']; // sunset
  if (hour >= 5  && hour < 10)             return ['#FFF8D6', '#FFFEF5']; // morning
  return ['#FFF2E5', '#FFFAF5'];                                           // sunny midday
}

export const planTypeConfig: Record<string, { label: string; icon: string; gradient: [string, string] }> = {
  exclusive_date: { label: 'Exclusive Date', icon: 'heart-outline',   gradient: ['#FF3D6B', '#FF6B9D'] },
  group_hangout:  { label: 'Group Hangout',  icon: 'people-outline',  gradient: ['#FF6B35', '#FF9A56'] },
  open:           { label: 'Open Plan',      icon: 'globe-outline',   gradient: ['#FF8C42', '#FFC107'] },
};

export const globalStyles = StyleSheet.create({
  flex1: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  screenPadding: { paddingHorizontal: spacing.base },
});
