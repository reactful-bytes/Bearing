import { formatSummaryDate } from '../dateFormatting';

describe('formatSummaryDate', () => {
  const referenceDate = new Date(2026, 9, 10, 12);

  it('omits the year through the one-year anniversary and includes it after', () => {
    expect(formatSummaryDate(new Date(2026, 9, 15), 'en-US', referenceDate)).toBe('Oct 15');
    expect(formatSummaryDate(new Date(2027, 9, 10), 'en-US', referenceDate)).toBe('Oct 10');
    expect(formatSummaryDate(new Date(2027, 9, 15), 'en-US', referenceDate)).toBe('Oct 15, 2027');
  });

  it('uses the final day of February as the anniversary in a non-leap year', () => {
    const leapYearReferenceDate = new Date(2024, 1, 29, 12);

    expect(formatSummaryDate(new Date(2025, 1, 28), 'en-US', leapYearReferenceDate)).toBe('Feb 28');
    expect(formatSummaryDate(new Date(2025, 2, 1), 'en-US', leapYearReferenceDate)).toBe(
      'Mar 1, 2025',
    );
  });
});
