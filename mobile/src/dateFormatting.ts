export function formatSummaryDate(
  date: Date,
  locale?: string,
  referenceDate: Date = new Date(),
): string {
  const firstDayOfNextYear = new Date(
    referenceDate.getFullYear() + 1,
    referenceDate.getMonth(),
    referenceDate.getDate(),
  );
  if (firstDayOfNextYear.getMonth() !== referenceDate.getMonth()) {
    firstDayOfNextYear.setDate(0);
  }

  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const referenceDateOnly = new Date(
    firstDayOfNextYear.getFullYear(),
    firstDayOfNextYear.getMonth(),
    firstDayOfNextYear.getDate(),
  );
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
  };
  if (dateOnly > referenceDateOnly) options.year = 'numeric';

  return date.toLocaleDateString(locale, options);
}
