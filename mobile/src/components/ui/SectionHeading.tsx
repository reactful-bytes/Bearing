import { ReactNode } from 'react';

import { SectionHeader, SectionHeaderVariant } from './SectionHeader';

type SectionHeadingProps = {
  title: string;
  description?: string;
  trailing?: ReactNode;
  variant?: SectionHeaderVariant;
};

export function SectionHeading({ title, description, trailing, variant }: SectionHeadingProps) {
  return (
    <SectionHeader title={title} description={description} trailing={trailing} variant={variant} />
  );
}
