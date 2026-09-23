import type { SelectionOption } from '../../components/ui/SelectionModal';

export function getSelectionLabel(
  options: SelectionOption[],
  value: string,
  fallbackLabel: string,
): string {
  return options.find((option) => option.value === value)?.label ?? fallbackLabel;
}
