import { RowContextMenu } from '../ui/RowContextMenu';

type TaskActionMenuProps = {
  onEdit: () => void;
  onDelete: () => void;
  onReactivate?: () => void;
  accessibilityLabel?: string;
};

export function TaskActionMenu({
  onEdit,
  onDelete,
  onReactivate,
  accessibilityLabel = 'Task actions',
}: TaskActionMenuProps) {
  return (
    <RowContextMenu
      accessibilityLabel={accessibilityLabel}
      menuAccessibilityLabel="Task actions menu"
      items={[
        { label: 'Edit', accessibilityLabel: 'Edit task', icon: 'edit', onPress: onEdit },
        ...(onReactivate
          ? [
              {
                label: 'Mark Active',
                accessibilityLabel: 'Mark task active',
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
