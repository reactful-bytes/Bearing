import { spacing } from '../../design/tokens';
import { EventForm, EventFormProps } from './EventForm';

type EventEditFormProps = Omit<EventFormProps, 'saveLabel'> & {
  saveLabel?: string;
};

export function EventEditForm({ saveLabel = 'Update Event', ...props }: EventEditFormProps) {
  return (
    <EventForm
      {...props}
      saveLabel={saveLabel}
      contentContainerStyle={{ paddingHorizontal: spacing.lg }}
    />
  );
}
