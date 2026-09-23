import { EventForm, EventFormProps } from './EventForm';

type EventCreateFormProps = Omit<EventFormProps, 'saveLabel'> & {
  saveLabel?: string;
};

export function EventCreateForm({ saveLabel = 'Add Event', ...props }: EventCreateFormProps) {
  return <EventForm {...props} saveLabel={saveLabel} />;
}
