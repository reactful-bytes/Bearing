import { AddEventModal } from '../calendar/AddEventModal';
import type { CreateEventInput, CreateEventOptions } from '../../features/calendar/calendarTypes';
import type { TimeFormat } from '../../features/profile/timeFormat';
import type { TaskRecord } from '../../features/tasks/taskTypes';

type ScheduleTaskModalProps = {
  visible: boolean;
  task: TaskRecord | null;
  publicationCalendarTitle?: string | null;
  locale?: string;
  timeFormat?: TimeFormat;
  onClose: () => void;
  onSave: (input: CreateEventInput, options: CreateEventOptions) => Promise<void>;
};

export function ScheduleTaskModal({
  visible,
  task,
  publicationCalendarTitle,
  locale,
  timeFormat,
  onClose,
  onSave,
}: ScheduleTaskModalProps) {
  return (
    <AddEventModal
      visible={visible}
      modalTitle="Schedule Task"
      initialDate={task?.dueDate ?? new Date()}
      initialValues={
        task
          ? {
              title: task.title,
              description: task.description,
              goalId: task.goalId,
              taskId: task.id,
            }
          : undefined
      }
      publicationCalendarTitle={publicationCalendarTitle}
      locale={locale}
      timeFormat={timeFormat}
      fullScreen
      onClose={onClose}
      onSave={onSave}
    />
  );
}