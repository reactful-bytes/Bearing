import { ProfileTip } from './profileTypes';

export const PROFILE_TIPS: ProfileTip[] = [
  {
    id: 'tip-1',
    title: 'Bearing Tip',
    body: 'Use Focus Mode during scheduled work blocks and send interruptions to Idea Dump instead of context-switching.',
  },
  {
    id: 'tip-2',
    title: 'Life Wisdom',
    body: 'A plan becomes believable when the next action is small enough to start before motivation arrives.',
  },
  {
    id: 'tip-3',
    title: 'Bearing Tip',
    body: 'Review your Notes tab after Focus Mode sessions and either schedule, archive, or rewrite each captured thought.',
  },
  {
    id: 'tip-4',
    title: 'Life Wisdom',
    body: 'Consistency compounds faster than intensity when the work is meant to last for years.',
  },
  {
    id: 'tip-5',
    title: 'Bearing Tip',
    body: 'Tie goal steps to real calendar time whenever possible. Planned intent is weaker than scheduled intent.',
  },
];

export function getRandomProfileTip(randomValue: number = Math.random()): ProfileTip {
  const index = Math.floor(randomValue * PROFILE_TIPS.length) % PROFILE_TIPS.length;
  return PROFILE_TIPS[index];
}

export function getDifferentRandomProfileTip(currentTipId: string | null): ProfileTip {
  if (PROFILE_TIPS.length <= 1) {
    return PROFILE_TIPS[0];
  }

  let nextTip = getRandomProfileTip();

  while (nextTip.id === currentTipId) {
    nextTip = getRandomProfileTip();
  }

  return nextTip;
}
