import { ImageSourcePropType } from 'react-native';

type SvgPath = { d: string };
type SvgCircle = { cx: number; cy: number; r: number };
type SvgRect = { x: number; y: number; width: number; height: number; rx?: number };

type SvgIconDefinition = {
  kind: 'svg';
  paths: readonly SvgPath[];
  circles?: readonly SvgCircle[];
  rects?: readonly SvgRect[];
};

type ImageIconDefinition = {
  kind: 'image';
  source: ImageSourcePropType;
  tintable: boolean;
};

export type AppIconDefinition = SvgIconDefinition | ImageIconDefinition;

// Path data comes from the approved Bearing icon-library source. Feature-graphic
// crops retain the distinctive colored primary navigation artwork.
export const icons = {
  back: { kind: 'svg', paths: [{ d: 'm14 6-6 6 6 6M8 12h12' }] },
  calendar: {
    kind: 'svg',
    rects: [{ x: 3, y: 4, width: 18, height: 17, rx: 2 }],
    paths: [
      {
        d: 'M7 2v4M17 2v4M3 9h18M7 13h.01M11 13h.01M15 13h.01M7 17h.01M11 17h.01M15 17h.01',
      },
    ],
  },
  close: { kind: 'svg', paths: [{ d: 'm6 6 12 12M18 6 6 18' }] },
  create: {
    kind: 'svg',
    circles: [{ cx: 12, cy: 12, r: 8 }],
    paths: [{ d: 'M12 8v8M8 12h8' }],
  },
  edit: {
    kind: 'svg',
    paths: [{ d: 'm4 16-.8 4.8L8 20l10.8-10.8a2.1 2.1 0 0 0-3-3zM13.5 7.5l3 3' }],
  },
  focus: { kind: 'image', source: require('../../assets/icons/focus.png'), tintable: false },
  goal: { kind: 'image', source: require('../../assets/icons/goals.png'), tintable: false },
  idea: {
    kind: 'svg',
    paths: [
      {
        d: 'M9 18h6M10 21h4M8.5 15.5A6 6 0 1 1 15.5 15.5c-.8.6-1.5 1.5-1.5 2.5h-4c0-1-.7-1.9-1.5-2.5zM12 2v2M4.2 4.2l1.4 1.4M19.8 4.2l-1.4 1.4',
      },
    ],
  },
  more: {
    kind: 'svg',
    circles: [
      { cx: 5, cy: 12, r: 1 },
      { cx: 12, cy: 12, r: 1 },
      { cx: 19, cy: 12, r: 1 },
    ],
    paths: [],
  },
  note: { kind: 'image', source: require('../../assets/icons/notes.png'), tintable: false },
  profile: {
    kind: 'svg',
    circles: [{ cx: 12, cy: 8, r: 3.5 }],
    paths: [{ d: 'M5 21c.7-4 3.1-6 7-6s6.3 2 7 6' }],
  },
  search: { kind: 'svg', circles: [{ cx: 10.5, cy: 10.5, r: 6.5 }], paths: [{ d: 'm16 16 5 5' }] },
  task: {
    kind: 'svg',
    rects: [{ x: 4, y: 4, width: 16, height: 16, rx: 2 }],
    paths: [{ d: 'm8 12 3 3 5-6' }],
  },
  timeline: {
    kind: 'svg',
    circles: [
      { cx: 7, cy: 7, r: 2 },
      { cx: 17, cy: 12, r: 2 },
      { cx: 7, cy: 17, r: 2 },
    ],
    paths: [{ d: 'M7 4v16M17 4v16M9 7h6M9 17h6' }],
  },
  plan: { kind: 'image', source: require('../../assets/icons/plan.png'), tintable: false },
  goals: { kind: 'image', source: require('../../assets/icons/goals.png'), tintable: false },
  notes: { kind: 'image', source: require('../../assets/icons/notes.png'), tintable: false },
  bearingMark: {
    kind: 'image',
    source: require('../../assets/icons/bearing-mark.png'),
    tintable: true,
  },
} as const satisfies Record<string, AppIconDefinition>;

export type AppIconName = keyof typeof icons;
