import { RowContextMenu } from '../ui/RowContextMenu';

type TaskActionMenuProps = {
  onEdit: () => void;
  onDelete: () => void;
  onComplete?: () => void;
  onReactivate?: () => void;
  accessibilityLabel?: string;
};

export function TaskActionMenu({
  onEdit,
  onDelete,
  onComplete,
  onReactivate,
  accessibilityLabel = 'Task actions',
}: TaskActionMenuProps) {
  return (
    <RowContextMenu
      accessibilityLabel={accessibilityLabel}
      menuAccessibilityLabel="Task actions menu"
      items={[
        { label: 'Edit', accessibilityLabel: 'Edit task', icon: 'edit', onPress: onEdit },
        ...(onComplete
          ? [
              {
                label: 'Complete',
                accessibilityLabel: 'Complete task',
                icon: 'complete' as const,
                onPress: onComplete,
              },
            ]
          : []),
        ...(onReactivate
          ? [
              {
                label: 'Uncomplete',
                accessibilityLabel: 'Uncomplete task',
                icon: 'refresh' as const,
                onPress: onReactivate,
              },
            ]
          : []),
        {
          label: 'Delete',
          accessibilityLabel: 'Delete task',
          icon: 'delete',
          tone: 'danger',
          onPress: onDelete,
        },
      ]}
    />
  );
}
