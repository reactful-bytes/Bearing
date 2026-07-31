export type LegalDocumentId = 'privacy' | 'terms';

export type LegalDocument = {
  title: string;
  effectiveDate: string;
  notice: string;
  introduction: string;
  sections: { heading: string; body: string }[];
};

export const LEGAL_DOCUMENTS: Record<LegalDocumentId, LegalDocument> = {
  privacy: {
    title: 'Privacy Policy',
    effectiveDate: 'July 31, 2026',
    notice: 'Draft for owner and legal review. Not approved for publication.',
    introduction:
      'This policy explains how Bearing handles information when you use the mobile app and its connected services.',
    sections: [
      {
        heading: 'Information you provide',
        body: 'Bearing stores account details such as email, display name, timezone, and locale, plus the events, goals, steps, tasks, and notes you choose to save. Passwords are handled by Firebase Authentication and are not stored in Bearing application records.',
      },
      {
        heading: 'How information is used',
        body: 'Bearing uses account and planning information to authenticate you, synchronize your saved content, provide scheduling and goal features, protect the service, answer privacy requests, and maintain reliable operation. Bearing does not sell personal information or use it for advertising.',
      },
      {
        heading: 'Device calendars',
        body: 'Calendar access is optional. Device-originated events are read live from calendars you select and are not copied to Bearing cloud storage. Calendar selections and native link identifiers stay on the device under your account namespace. Bearing writes a system-calendar copy only when you request publication. Revoking permission leaves Bearing-only scheduling available.',
      },
      {
        heading: 'AI goal planning',
        body: 'When an eligible user requests an AI goal plan, the goal title, description, and target date are sent through a protected Firebase Function to Google Gemini. Generated drafts can be inaccurate and remain editable; nothing is added to a saved goal until you approve the plan. Do not submit sensitive personal information that is unnecessary for planning.',
      },
      {
        heading: 'Optional product diagnostics',
        body: 'Product diagnostics are off by default and scoped to your account on this installation. If enabled, Bearing sends only fixed event names and result categories. Custom diagnostic payloads exclude account IDs, email, planning content, calendar names and IDs, locations, and raw errors. Standard service request logs may still contain ordinary network and security metadata.',
      },
      {
        heading: 'Service providers',
        body: 'Bearing relies on Google Firebase for authentication, database, server functions, App Check, and operational logs; Google Gemini for requested AI generation; Apple and Google for app distribution and future in-app billing; and GitHub for source and release automation. These providers process information under their own terms and data-protection commitments.',
      },
      {
        heading: 'Retention and security',
        body: 'Saved account content is retained while your account remains active and until deletion is requested, subject to limited security logs, backups, legal obligations, and recovery windows. Product-event logs are intended to be retained for 30 days. Firestore backups may be retained for up to 12 months. Bearing uses authentication, App Check, ownership rules, least-privilege access, and encrypted provider transport, but no service can guarantee absolute security.',
      },
      {
        heading: 'Your choices and requests',
        body: 'You can disable diagnostics and calendar access, export account data as JSON, export Bearing events as ICS, and request account deletion from Profile. After recent verification, a successful deletion request removes active Bearing cloud records and authentication. This installation then attempts to purge account-scoped calendar settings and diagnostics consent. Reachable linked calendar copies can be removed first; other devices, external calendars, exports, logs, or backup remnants may persist as described in the hosted policy.',
      },
      {
        heading: 'Children and changes',
        body: 'Bearing is not directed to children under the minimum age approved for the release market. The final release age threshold and regional disclosures will be published with the hosted policy. Material policy changes will receive an updated effective date and any notice required by law.',
      },
      {
        heading: 'Contact',
        body: 'Use Support in Profile for privacy questions, access or deletion requests, and complaints. The release operator identity, mailing address, and jurisdiction-specific contact details will also appear in the publicly hosted policy before store submission.',
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    effectiveDate: 'July 31, 2026',
    notice: 'Draft for owner and legal review. Not approved for publication.',
    introduction:
      'These terms govern access to Bearing. Do not use the service if you do not agree to them.',
    sections: [
      {
        heading: 'Eligibility and accounts',
        body: 'You must meet the minimum age approved for your release market and be legally able to accept these terms. Provide accurate account information, protect your credentials, and notify Support about suspected unauthorized access. You are responsible for activity under your account.',
      },
      {
        heading: 'Permitted use',
        body: 'Bearing grants you a limited, revocable, non-transferable right to use the app for personal planning. Do not misuse the service, probe or bypass security, interfere with other users, automate abusive requests, upload unlawful content, or infringe intellectual-property or privacy rights.',
      },
      {
        heading: 'Your content',
        body: 'You retain ownership of content you enter. You grant Bearing only the rights needed to host, process, synchronize, export, and display that content to provide and secure the service. You are responsible for having the right to use content and calendar data you submit or publish.',
      },
      {
        heading: 'AI-assisted features',
        body: 'AI output may be incomplete, inaccurate, or unsuitable. Review and edit every draft before relying on it. Bearing does not provide medical, legal, financial, emergency, or other professional advice. Seek a qualified professional when appropriate and do not use Bearing for emergency decisions.',
      },
      {
        heading: 'Calendars and third-party services',
        body: 'Calendar access depends on your device, operating system, account providers, permissions, and writable-calendar capabilities. Publication and synchronization are best effort. You remain responsible for reviewing dates, recurrence, alarms, and linked copies. Third-party services are governed by their own terms.',
      },
      {
        heading: 'Subscriptions',
        body: 'If Premium subscriptions are offered, price, billing period, trial terms, and included features will be shown before purchase. Store subscriptions may renew automatically unless canceled through Apple or Google account settings before renewal. The applicable store controls billing, cancellation, and refund requests. Deleting Bearing does not by itself cancel a store subscription.',
      },
      {
        heading: 'Availability and changes',
        body: 'Bearing may modify, suspend, or discontinue features and may impose reasonable usage limits. The service is provided as available without a promise of uninterrupted or error-free operation. Export important information and keep independent copies where appropriate.',
      },
      {
        heading: 'Disclaimers and liability',
        body: 'To the extent permitted by law, Bearing is provided without implied warranties and the operator is not liable for indirect, incidental, special, consequential, or punitive losses. Mandatory consumer rights and liabilities that cannot legally be excluded remain unaffected.',
      },
      {
        heading: 'Termination and disputes',
        body: 'You may stop using Bearing and delete your account. Access may be suspended for security, unlawful use, or material breach. Final operator identity, governing law, venue, consumer-rights notices, and dispute process require owner and legal approval before release and will appear in the hosted terms.',
      },
      {
        heading: 'Contact and updates',
        body: 'Use Support in Profile for service or legal questions. Updated terms will show a new effective date, and material changes will receive any notice required by law.',
      },
    ],
  },
};

export function getConfiguredSupportEmail(): string | null {
  const email = process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim() ?? '';
  return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email) ? email : null;
}
