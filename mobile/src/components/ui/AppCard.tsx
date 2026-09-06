import { ReactNode } from 'react';
import { ViewStyle } from 'react-native';

import { Card } from './Card';

type AppCardProps = {
  children: ReactNode;
  style?: ViewStyle;
};

export function AppCard({ children, style }: AppCardProps) {
  return <Card style={style}>{children}</Card>;
}
