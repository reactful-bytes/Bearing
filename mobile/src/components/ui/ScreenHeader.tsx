import { ReactNode } from 'react';

import { AppHeader } from './AppHeader';
import { IconButton } from './IconButton';

type ScreenHeaderProps = {
  title?: string;
  description?: string;
  eyebrow?: string;
  trailing?: ReactNode;
  onPressBack?: () => void;
  backAccessibilityLabel?: string;
};

export function ScreenHeader({
  title = '',
  description,
  eyebrow,
  trailing,
  onPressBack,
  backAccessibilityLabel = 'Go back',
}: ScreenHeaderProps) {
  if (onPressBack) {
    return (
      <AppHeader
        title={title}
        centeredTitle
        leading={
          <IconButton name="back" accessibilityLabel={backAccessibilityLabel} onPress={onPressBack} />
        }
      />
    );
  }

  return <AppHeader title={title} eyebrow={eyebrow} subtitle={description} trailing={trailing} />;
}
