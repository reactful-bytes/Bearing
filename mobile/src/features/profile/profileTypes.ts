export type PremiumStatus = 'free' | 'premium' | 'grace_period' | 'canceled';

export type PremiumSource = 'ios' | 'android' | 'stripe' | 'none';

export type UserProfileUiState = 'loading' | 'error' | 'ready';

export type UserProfileRecord = {
  userId: string;
  displayName: string;
  email: string;
  timezone: string;
  locale: string;
  premiumStatus: PremiumStatus;
  premiumSource: PremiumSource;
  tipsEnabled: boolean;
  reminderSoundId: string;
  alarmSoundId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type UpdateUserProfileInput = Partial<
  Pick<
    UserProfileRecord,
    'displayName' | 'timezone' | 'locale' | 'tipsEnabled' | 'reminderSoundId' | 'alarmSoundId'
  >
>;

export type ProfileSoundOption = {
  id: string;
  label: string;
  description: string;
  sequence: {
    frequency: number | null;
    durationMs: number;
    volume?: number;
  }[];
};

export type ProfileTip = {
  id: string;
  title: string;
  body: string;
};
