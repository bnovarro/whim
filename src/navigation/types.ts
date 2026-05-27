import { NavigatorScreenParams } from '@react-navigation/native';
import { ActivityType, VibeTag } from '../types';

export type RootStackParamList = {
  Welcome: undefined;
  Auth: { mode: 'login' | 'signup' };
  ProfileSetup: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  CreateWhim: { activityType?: ActivityType; vibes?: VibeTag[]; planMode?: 'find' | 'explore' | 'date' } | undefined;
  WhimDetail: { whimId: string };
  Profile: undefined;
  UserProfile: { userId: string; name: string; photo?: string; instagram?: string };
};

export type MainTabParamList = {
  HomeTab: undefined;
  CalendarTab: undefined;
  CreateTab: undefined;
  ExploreTab: undefined;
  DatingTab: undefined;
};
