import { ReactNode } from 'react';

import { AppHeader } from './AppHeader';

type ScreenHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  trailing?: ReactNode;
};

export function ScreenHeader({ title, description, eyebrow, trailing }: ScreenHeaderProps) {
  return <AppHeader title={title} eyebrow={eyebrow} subtitle={description} trailing={trailing} />;
}
