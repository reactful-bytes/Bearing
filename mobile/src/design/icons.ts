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

const svg = (
  paths: readonly SvgPath[],
  circles?: readonly SvgCircle[],
  rects?: readonly SvgRect[],
): SvgIconDefinition => ({ kind: 'svg', paths, circles, rects });

// The approved icon-library mock is the primary icon source. The custom SVG
// definitions below are a secondary, scalable fallback library for foundations.
export const icons = {
  back: { kind: 'image', source: require('../../assets/icons/back.png'), tintable: false },
  calendar: {
    kind: 'image',
    source: require('../../assets/icons/calendar.png'),
    tintable: false,
  },
  close: { kind: 'image', source: require('../../assets/icons/close.png'), tintable: false },
  create: {
    kind: 'image',
    source: require('../../assets/icons/create.png'),
    tintable: false,
  },
  edit: { kind: 'image', source: require('../../assets/icons/edit.png'), tintable: false },
  focus: { kind: 'image', source: require('../../assets/icons/focus-2.png'), tintable: false },
  goal: { kind: 'image', source: require('../../assets/icons/goal.png'), tintable: false },
  idea: { kind: 'image', source: require('../../assets/icons/idea.png'), tintable: false },
  more: { kind: 'image', source: require('../../assets/icons/more.png'), tintable: false },
  note: { kind: 'image', source: require('../../assets/icons/note.png'), tintable: false },
  profile: {
    kind: 'image',
    source: require('../../assets/icons/profile.png'),
    tintable: false,
  },
  search: {
    kind: 'image',
    source: require('../../assets/icons/search.png'),
    tintable: false,
  },
  task: { kind: 'image', source: require('../../assets/icons/task.png'), tintable: false },
  timeline: {
    kind: 'image',
    source: require('../../assets/icons/timeline.png'),
    tintable: false,
  },
  // Mock crop was mislabeled "plan" during extraction; the artwork is a home glyph.
  plan: { kind: 'image', source: require('../../assets/icons/home.png'), tintable: false },
  goals: { kind: 'image', source: require('../../assets/icons/goals-2.png'), tintable: false },
  notes: { kind: 'image', source: require('../../assets/icons/note.png'), tintable: false },
  bearingMark: {
    kind: 'image',
    source: require('../../assets/icons/bearing-mark.png'),
    tintable: true,
  },
  planOutline: svg([{ d: 'M4 10.5 12 4l8 6.5V20H4zM9 20v-5h6v5' }]),
  calendarOutline: svg(
    [{ d: 'M7 2v4M17 2v4M3 9h18M7 13h.01M11 13h.01M15 13h.01M7 17h.01M11 17h.01M15 17h.01' }],
    undefined,
    [{ x: 3, y: 4, width: 18, height: 17, rx: 2 }],
  ),
  createOutline: svg([{ d: 'M12 8v8M8 12h8' }], [{ cx: 12, cy: 12, r: 8 }]),
  noteOutline: svg([
    {
      d: 'M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM9 9h6M9 13h6M9 17h4',
    },
  ]),
  profileAvatar: svg([{ d: 'M5 21c.7-4 3.1-6 7-6s6.3 2 7 6' }], [{ cx: 12, cy: 8, r: 3.5 }]),
  menu: svg([{ d: 'M4 7h16M4 12h16M4 17h16' }]),
  filter: svg([{ d: 'M4 5h16l-6 7v5l-4 2v-7z' }]),
  notifications: svg([{ d: 'M18 10a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 22h4' }]),
  settings: svg([
    {
      d: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19.4 15a1.8 1.8 0 0 0 .4 2l-1.8 1.8a1.8 1.8 0 0 0-2-.4l-1 .4V21h-3v-2.2l-1-.4a1.8 1.8 0 0 0-2 .4L7.2 17a1.8 1.8 0 0 0 .4-2l-.4-1H5v-3h2.2l.4-1a1.8 1.8 0 0 0-.4-2L9 6.2a1.8 1.8 0 0 0 2 .4l1-.4V4h3v2.2l1 .4a1.8 1.8 0 0 0 2-.4L19.8 8a1.8 1.8 0 0 0-.4 2l.4 1H22v3h-2.2z',
    },
  ]),
  today: svg(
    [
      {
        d: 'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1',
      },
    ],
    [{ cx: 12, cy: 12, r: 4 }],
  ),
  focusOutline: svg(
    [
      {
        d: 'M12 4v3M12 17v3M4 12h3M17 12h3M8.5 8.5l2 2M13.5 13.5l2 2M15.5 8.5l-2 2M10.5 13.5l-2 2',
      },
    ],
    [{ cx: 12, cy: 12, r: 5 }],
  ),
  goalsOutline: svg(
    [
      {
        d: 'M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M17.7 6.3l-2.8 2.8M9.1 14.9l-2.8 2.8',
      },
    ],
    [{ cx: 12, cy: 12, r: 4 }],
  ),
  ideaDump: svg([
    {
      d: 'M9 18h6M10 21h4M8.5 15.5A6 6 0 1 1 15.5 15.5c-.8.6-1.5 1.5-1.5 2.5h-4c0-1-.7-1.9-1.5-2.5zM12 2v2M4.2 4.2l1.4 1.4M19.8 4.2l-1.4 1.4',
    },
  ]),
  upcoming: svg(
    [{ d: 'M8 6h12M8 12h12M8 18h12' }],
    [
      { cx: 4, cy: 6, r: 1 },
      { cx: 4, cy: 12, r: 1 },
      { cx: 4, cy: 18, r: 1 },
    ],
  ),
  completed: svg([{ d: 'm7 12 3 3 7-7' }], [{ cx: 12, cy: 12, r: 9 }]),
  archive: svg([{ d: 'M4 7h16v13H4zM3 4h18v3H3zM9 12h6' }]),
  delete: svg([{ d: 'M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5' }]),
  dayView: svg([{ d: 'M8 4h12M8 9h12M8 14h12M8 19h12' }], undefined, [
    { x: 3, y: 3, width: 18, height: 18, rx: 2 },
  ]),
  monthView: svg(
    [{ d: 'M7 2v4M17 2v4M3 9h18M7 13h.01M12 13h.01M17 13h.01M7 17h.01M12 17h.01M17 17h.01' }],
    undefined,
    [{ x: 3, y: 4, width: 18, height: 17, rx: 2 }],
  ),
  addEvent: svg([{ d: 'M12 8v8M8 12h8M7 2v4M17 2v4M3 9h18' }], undefined, [
    { x: 3, y: 4, width: 18, height: 17, rx: 2 },
  ]),
  location: svg(
    [{ d: 'M12 21s7-5.1 7-11a7 7 0 1 0-14 0c0 5.9 7 11 7 11z' }],
    [{ cx: 12, cy: 10, r: 2.5 }],
  ),
  pinned: svg([{ d: 'm14 4 6 6-3 1-3 5-2-2-5 3-1-1 3-5-2-2 5-3zM4 20l4-4' }]),
  tags: svg([{ d: 'M4 12V5h7l8 8-7 7z' }], [{ cx: 8, cy: 8, r: 1 }]),
  favorite: svg([{ d: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z' }]),
  share: svg([{ d: 'M8 12h8M8 12l3-3M8 12l3 3M16 7h3v12h-3' }]),
  account: svg([{ d: 'M5 21c.7-4 3.1-6 7-6s6.3 2 7 6' }], [{ cx: 12, cy: 8, r: 3.5 }]),
  integrations: svg([{ d: 'M9 8 7 6a3 3 0 0 0-4 4l2 2M15 16l2 2a3 3 0 0 0 4-4l-2-2M8 16l8-8' }]),
  security: svg([{ d: 'M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6zM9 12l2 2 4-4' }]),
  billing: svg([{ d: 'M4 7h16v11H4zM4 10h16M7 16h4' }]),
  legal: svg([{ d: 'M6 3h9l4 4v14H6zM15 3v5h5M9 12h6M9 16h6' }]),
  logout: svg([{ d: 'M10 5H5v14h5M14 8l4 4-4 4M8 12h10' }]),
  smartIntro: svg([{ d: 'm12 3 1.5 5.2L19 10l-5.5 1.8L12 17l-1.5-5.2L5 10l5.5-1.8z' }]),
  define: svg([{ d: 'm4 16-.8 4.8L8 20l10.8-10.8a2.1 2.1 0 0 0-3-3zM13.5 7.5l3 3' }]),
  targetDate: svg([{ d: 'M7 2v4M17 2v4M3 9h18M12 13v4M10 15h4' }], undefined, [
    { x: 3, y: 4, width: 18, height: 17, rx: 2 },
  ]),
  aiPlanning: svg([
    {
      d: 'M12 3a5 5 0 0 0-3 9c-1.3.8-2 2.1-2 3.5V18h10v-2.5c0-1.4-.7-2.7-2-3.5a5 5 0 0 0-3-9zM8 21h8M10 18v3M14 18v3',
    },
  ]),
  review: svg([{ d: 'm8 12 3 3 5-6' }], undefined, [{ x: 4, y: 4, width: 16, height: 16, rx: 2 }]),
  milestone: svg([{ d: 'M7 21V4M8 5h10l-2 4 2 4H8' }]),
  next: svg([{ d: 'M5 12h14M13 6l6 6-6 6' }]),
  cancel: svg([{ d: 'm8 8 8 8M16 8l-8 8' }], [{ cx: 12, cy: 12, r: 9 }]),
  duration: svg([{ d: 'M12 7v5l3 2' }], [{ cx: 12, cy: 12, r: 9 }]),
  progress: svg([{ d: 'M5 18v-4M10 18V9M15 18v-6M20 18V5M4 20h17' }]),
  map: svg([{ d: 'M4 6 9 3l6 3 5-3v15l-5 3-6-3-5 3zM9 3v15M15 6v15' }]),
  externalLink: svg([{ d: 'M14 5h5v5M19 5l-9 9M17 13v5H5V6h5' }]),
  copy: svg([{ d: 'M9 8h10v11H9zM5 16H4V5h11v1' }]),
  info: svg([{ d: 'M12 11v6M12 7h.01' }], [{ cx: 12, cy: 12, r: 9 }]),
  warning: svg([{ d: 'M12 8v5M12 17h.01M12 3l9 17H3z' }]),
  error: svg([{ d: 'M12 8v5M12 17h.01' }], [{ cx: 12, cy: 12, r: 9 }]),
  google: svg([
    {
      d: 'M21 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5a4.3 4.3 0 0 1-1.9 2.8v2.4h3.1c1.8-1.7 2.8-4.1 2.8-6.9zM12 21c2.5 0 4.6-.8 6.1-2.3l-3.1-2.4c-.8.6-1.8 1-3 1-2.3 0-4.3-1.6-5-3.7H3.8V16A9.2 9.2 0 0 0 12 21zM7 13.6A5.5 5.5 0 0 1 7 10.4V8H3.8a9.1 9.1 0 0 0 0 8zM12 6.7c1.4 0 2.7.5 3.7 1.4l2.8-2.8C16.6 3.5 14.5 3 12 3A9.2 9.2 0 0 0 3.8 8L7 10.4c.7-2.1 2.7-3.7 5-3.7z',
    },
  ]),
  link: svg([
    {
      d: 'M9 15 7 17a3 3 0 0 1-4-4l4-4a3 3 0 0 1 4 0M15 9l2-2a3 3 0 0 1 4 4l-4 4a3 3 0 0 1-4 0M8 12h8',
    },
  ]),
  timer: svg([{ d: 'M12 7v5l3 2M9 3h6' }], [{ cx: 12, cy: 13, r: 8 }]),
  active: svg([{ d: 'M12 4v3M12 17v3M4 12h3M17 12h3' }], [{ cx: 12, cy: 12, r: 5 }]),
  archived: svg([{ d: 'M4 7h16v13H4zM3 4h18v3H3zM9 12h6' }]),
  none: svg([], [{ cx: 12, cy: 12, r: 8 }]),
  date: svg([{ d: 'M7 2v4M17 2v4M3 9h18M8 13h8' }], undefined, [
    { x: 3, y: 4, width: 18, height: 17, rx: 2 },
  ]),
  time: svg([{ d: 'M12 7v5l3 2' }], [{ cx: 12, cy: 12, r: 9 }]),
  expand: svg([{ d: 'm7 10 5 5 5-5' }]),
  collapse: svg([{ d: 'm7 14 5-5 5 5' }]),
  image: svg([{ d: 'm4 17 5-5 3 3 3-4 5 6M7 8h.01' }], undefined, [
    { x: 3, y: 4, width: 18, height: 16, rx: 2 },
  ]),
  document: svg([{ d: 'M6 3h9l4 4v14H6zM15 3v5h5M9 12h6M9 16h6' }]),
  star: svg([{ d: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z' }]),
  newGoal: svg(
    [
      {
        d: 'M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M17.7 6.3l-2.8 2.8M9.1 14.9l-2.8 2.8',
      },
    ],
    [{ cx: 12, cy: 12, r: 4 }],
  ),
  newTask: svg([{ d: 'm8 12 3 3 5-6' }], undefined, [{ x: 4, y: 4, width: 16, height: 16, rx: 2 }]),
  newNote: svg([
    {
      d: 'M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM9 9h6M9 13h6M9 17h4',
    },
  ]),
  newEvent: svg([{ d: 'M12 8v8M8 12h8M7 2v4M17 2v4M3 9h18' }], undefined, [
    { x: 3, y: 4, width: 18, height: 17, rx: 2 },
  ]),
  focusMode: svg(
    [
      {
        d: 'M12 4v3M12 17v3M4 12h3M17 12h3M8.5 8.5l2 2M13.5 13.5l2 2M15.5 8.5l-2 2M10.5 13.5l-2 2',
      },
    ],
    [{ cx: 12, cy: 12, r: 5 }],
  ),
  add: svg([{ d: 'M12 8v8M8 12h8' }], [{ cx: 12, cy: 12, r: 8 }]),
  sessionDetails: svg([{ d: 'M6 3h9l4 4v14H6zM15 3v5h5M9 12h6M9 16h6' }]),
  goalMilestone: svg([{ d: 'M7 21V4M8 5h10l-2 4 2 4H8' }]),
  event: svg([{ d: 'M7 2v4M17 2v4M3 9h18M8 13h8' }], undefined, [
    { x: 3, y: 4, width: 18, height: 17, rx: 2 },
  ]),
  importedCalendar: svg(
    [{ d: 'M7 2v4M17 2v4M3 9h18M7 13h.01M12 13h.01M17 13h.01M7 17h.01M12 17h.01M17 17h.01' }],
    undefined,
    [{ x: 3, y: 4, width: 18, height: 17, rx: 2 }],
  ),
  focusBlock: svg([{ d: 'M12 4v3M12 17v3M4 12h3M17 12h3' }], [{ cx: 12, cy: 12, r: 5 }]),
  complete: svg([{ d: 'm7 12 3 3 7-7' }], [{ cx: 12, cy: 12, r: 9 }]),
  ideas: svg([
    {
      d: 'M9 18h6M10 21h4M8.5 15.5A6 6 0 1 1 15.5 15.5c-.8.6-1.5 1.5-1.5 2.5h-4c0-1-.7-1.9-1.5-2.5zM12 2v2M4.2 4.2l1.4 1.4M19.8 4.2l-1.4 1.4',
    },
  ]),
  holdToExit: svg([{ d: 'M12 4v8M8.5 7.5a6 6 0 1 0 7 0' }]),
  planSvg: svg([{ d: 'M4 10.5 12 4l8 6.5V20H4zM9 20v-5h6v5' }]),
  goalSvg: svg(
    [
      {
        d: 'M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M17.7 6.3l-2.8 2.8M9.1 14.9l-2.8 2.8',
      },
    ],
    [{ cx: 12, cy: 12, r: 4 }],
  ),
  notesSvg: svg([
    {
      d: 'M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM9 9h6M9 13h6M9 17h4',
    },
  ]),
  tasks: svg(
    [{ d: 'M8 6h10M8 12h10M8 18h10' }],
    [
      { cx: 4, cy: 6, r: 1 },
      { cx: 4, cy: 12, r: 1 },
      { cx: 4, cy: 18, r: 1 },
    ],
  ),
} as const satisfies Record<string, AppIconDefinition>;

export type AppIconName = keyof typeof icons;
