import { ReactNode } from 'react';

import { SectionHeader } from './SectionHeader';

type SectionHeadingProps = {
  title: string;
  description?: string;
  trailing?: ReactNode;
};

export function SectionHeading({ title, description, trailing }: SectionHeadingProps) {
  return <SectionHeader title={title} description={description} trailing={trailing} />;
}
