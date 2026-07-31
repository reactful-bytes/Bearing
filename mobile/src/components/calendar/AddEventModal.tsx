import { AppModal } from '../ui/AppModal';
import { CreateEventInput } from '../../features/calendar/calendarTypes';
import { EventForm } from './EventForm';

type AddEventInitialValues = Partial<CreateEventInput>;

type AddEventModalProps = {
  visible: boolean;
  initialDate: Date;
  modalTitle?: string;
  initialValues?: AddEventInitialValues;
  onClose: () => void;
  onSave: (input: CreateEventInput) => Promise<void>;
};

export function AddEventModal({
  visible,
  initialDate,
  modalTitle = 'Add Event',
  initialValues,
  onClose,
  onSave,
}: AddEventModalProps) {
  async function handleSave(input: CreateEventInput): Promise<void> {
    await onSave(input);
    onClose();
  }

  return (
    <AppModal visible={visible} title={modalTitle} onClose={onClose}>
      <EventForm
        active={visible}
        initialDate={initialDate}
        initialValues={initialValues}
        onSave={handleSave}
      />
    </AppModal>
  );
}
