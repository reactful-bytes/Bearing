import { afterEach, describe, expect, it } from '@jest/globals';

import { LEGAL_DOCUMENTS, getConfiguredSupportEmail } from '../features/profile/legalDocuments';

const originalSupportEmail = process.env.EXPO_PUBLIC_SUPPORT_EMAIL;

describe('legal documents', () => {
  afterEach(() => {
    if (originalSupportEmail === undefined) delete process.env.EXPO_PUBLIC_SUPPORT_EMAIL;
    else process.env.EXPO_PUBLIC_SUPPORT_EMAIL = originalSupportEmail;
  });

  it('includes the implemented privacy and subscription disclosure surfaces', () => {
    const privacyHeadings = LEGAL_DOCUMENTS.privacy.sections.map((section) => section.heading);
    const termsHeadings = LEGAL_DOCUMENTS.terms.sections.map((section) => section.heading);

    expect(privacyHeadings).toEqual(
      expect.arrayContaining([
        'Device calendars',
        'AI goal planning',
        'Optional product diagnostics',
        'Your choices and requests',
      ]),
    );
    expect(termsHeadings).toEqual(
      expect.arrayContaining([
        'AI-assisted features',
        'Calendars and third-party services',
        'Subscriptions',
      ]),
    );
    expect(LEGAL_DOCUMENTS.privacy.notice).toContain('Not approved for publication');
    expect(LEGAL_DOCUMENTS.terms.notice).toContain('Not approved for publication');
  });

  it('accepts only a valid configured support email', () => {
    process.env.EXPO_PUBLIC_SUPPORT_EMAIL = 'support@example.com';
    expect(getConfiguredSupportEmail()).toBe('support@example.com');

    process.env.EXPO_PUBLIC_SUPPORT_EMAIL = 'not-an-email';
    expect(getConfiguredSupportEmail()).toBeNull();

    process.env.EXPO_PUBLIC_SUPPORT_EMAIL = 'support@example.com?subject=override';
    expect(getConfiguredSupportEmail()).toBeNull();
  });
});
