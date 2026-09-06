import { MaterialIcons } from '@expo/vector-icons';
import { ImageSourcePropType } from 'react-native';

type VectorIconDefinition = {
  kind: 'vector';
  name: keyof typeof MaterialIcons.glyphMap;
};

type ImageIconDefinition = {
  kind: 'image';
  source: ImageSourcePropType;
  tintable: boolean;
};

export type AppIconDefinition = VectorIconDefinition | ImageIconDefinition;

export const icons = {
  back: { kind: 'vector', name: 'arrow-back' },
  calendar: { kind: 'vector', name: 'calendar-today' },
  close: { kind: 'vector', name: 'close' },
  create: { kind: 'vector', name: 'add' },
  edit: { kind: 'vector', name: 'edit' },
  focus: { kind: 'vector', name: 'center-focus-strong' },
  goal: { kind: 'vector', name: 'flag' },
  idea: { kind: 'vector', name: 'lightbulb-outline' },
  more: { kind: 'vector', name: 'more-horiz' },
  note: { kind: 'vector', name: 'description' },
  profile: { kind: 'vector', name: 'person-outline' },
  search: { kind: 'vector', name: 'search' },
  task: { kind: 'vector', name: 'check-box-outline-blank' },
  timeline: { kind: 'vector', name: 'outlined-flag' },
  bearingMark: {
    kind: 'image',
    source: require('../../assets/bearingLogoSmall.png'),
    tintable: false,
  },
} as const satisfies Record<string, AppIconDefinition>;

export type AppIconName = keyof typeof icons;
