import { ImageSourcePropType } from 'react-native';

// Legacy hand/AI-generated icon assets kept in assets/icons/ but not wired into
// the semantic icon registry in icons.ts. Shown here for gallery review only.
export const legacyIconAssets: { name: string; source: ImageSourcePropType }[] = [
  { name: 'focus-1', source: require('../../assets/icons/focus-1.png') },
  { name: 'goals-1', source: require('../../assets/icons/goals-1.png') },
  { name: 'notes-1', source: require('../../assets/icons/notes-1.png') },
  { name: 'plan', source: require('../../assets/icons/plan.png') },
];
