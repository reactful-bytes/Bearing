export type ProfileSelectionOption = {
  value: string;
  label: string;
};

const FALLBACK_TIMEZONES = [
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Africa/Lagos',
  'America/Anchorage',
  'America/Argentina/Buenos_Aires',
  'America/Bogota',
  'America/Chicago',
  'America/Denver',
  'America/Halifax',
  'America/Los_Angeles',
  'America/Mexico_City',
  'America/New_York',
  'America/Phoenix',
  'America/Sao_Paulo',
  'America/Toronto',
  'Asia/Bangkok',
  'Asia/Dhaka',
  'Asia/Dubai',
  'Asia/Hong_Kong',
  'Asia/Jakarta',
  'Asia/Jerusalem',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Manila',
  'Asia/Seoul',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Adelaide',
  'Australia/Brisbane',
  'Australia/Melbourne',
  'Australia/Perth',
  'Australia/Sydney',
  'Europe/Amsterdam',
  'Europe/Athens',
  'Europe/Berlin',
  'Europe/Dublin',
  'Europe/Helsinki',
  'Europe/Istanbul',
  'Europe/Lisbon',
  'Europe/London',
  'Europe/Madrid',
  'Europe/Moscow',
  'Europe/Paris',
  'Europe/Rome',
  'Pacific/Auckland',
  'Pacific/Fiji',
  'Pacific/Honolulu',
];

const LOCALE_CANDIDATES = [
  { value: 'af-ZA', label: 'Afrikaans (South Africa)' },
  { value: 'ar-AE', label: 'Arabic (United Arab Emirates)' },
  { value: 'ar-EG', label: 'Arabic (Egypt)' },
  { value: 'ar-SA', label: 'Arabic (Saudi Arabia)' },
  { value: 'bg-BG', label: 'Bulgarian (Bulgaria)' },
  { value: 'bn-BD', label: 'Bangla (Bangladesh)' },
  { value: 'cs-CZ', label: 'Czech (Czech Republic)' },
  { value: 'da-DK', label: 'Danish (Denmark)' },
  { value: 'de-AT', label: 'German (Austria)' },
  { value: 'de-CH', label: 'German (Switzerland)' },
  { value: 'de-DE', label: 'German (Germany)' },
  { value: 'el-GR', label: 'Greek (Greece)' },
  { value: 'en-AU', label: 'English (Australia)' },
  { value: 'en-CA', label: 'English (Canada)' },
  { value: 'en-GB', label: 'English (United Kingdom)' },
  { value: 'en-IE', label: 'English (Ireland)' },
  { value: 'en-IN', label: 'English (India)' },
  { value: 'en-NZ', label: 'English (New Zealand)' },
  { value: 'en-PH', label: 'English (Philippines)' },
  { value: 'en-SG', label: 'English (Singapore)' },
  { value: 'en-US', label: 'English (United States)' },
  { value: 'es-AR', label: 'Spanish (Argentina)' },
  { value: 'es-CL', label: 'Spanish (Chile)' },
  { value: 'es-CO', label: 'Spanish (Colombia)' },
  { value: 'es-ES', label: 'Spanish (Spain)' },
  { value: 'es-MX', label: 'Spanish (Mexico)' },
  { value: 'es-US', label: 'Spanish (United States)' },
  { value: 'et-EE', label: 'Estonian (Estonia)' },
  { value: 'fa-IR', label: 'Persian (Iran)' },
  { value: 'fi-FI', label: 'Finnish (Finland)' },
  { value: 'fil-PH', label: 'Filipino (Philippines)' },
  { value: 'fr-BE', label: 'French (Belgium)' },
  { value: 'fr-CA', label: 'French (Canada)' },
  { value: 'fr-CH', label: 'French (Switzerland)' },
  { value: 'fr-FR', label: 'French (France)' },
  { value: 'he-IL', label: 'Hebrew (Israel)' },
  { value: 'hi-IN', label: 'Hindi (India)' },
  { value: 'hr-HR', label: 'Croatian (Croatia)' },
  { value: 'hu-HU', label: 'Hungarian (Hungary)' },
  { value: 'id-ID', label: 'Indonesian (Indonesia)' },
  { value: 'it-IT', label: 'Italian (Italy)' },
  { value: 'ja-JP', label: 'Japanese (Japan)' },
  { value: 'ko-KR', label: 'Korean (South Korea)' },
  { value: 'lt-LT', label: 'Lithuanian (Lithuania)' },
  { value: 'lv-LV', label: 'Latvian (Latvia)' },
  { value: 'ms-MY', label: 'Malay (Malaysia)' },
  { value: 'nb-NO', label: 'Norwegian Bokmal (Norway)' },
  { value: 'nl-BE', label: 'Dutch (Belgium)' },
  { value: 'nl-NL', label: 'Dutch (Netherlands)' },
  { value: 'pl-PL', label: 'Polish (Poland)' },
  { value: 'pt-BR', label: 'Portuguese (Brazil)' },
  { value: 'pt-PT', label: 'Portuguese (Portugal)' },
  { value: 'ro-RO', label: 'Romanian (Romania)' },
  { value: 'ru-RU', label: 'Russian (Russia)' },
  { value: 'sk-SK', label: 'Slovak (Slovakia)' },
  { value: 'sl-SI', label: 'Slovenian (Slovenia)' },
  { value: 'sr-RS', label: 'Serbian (Serbia)' },
  { value: 'sv-SE', label: 'Swedish (Sweden)' },
  { value: 'sw-KE', label: 'Swahili (Kenya)' },
  { value: 'ta-IN', label: 'Tamil (India)' },
  { value: 'ta-SG', label: 'Tamil (Singapore)' },
  { value: 'th-TH', label: 'Thai (Thailand)' },
  { value: 'tr-TR', label: 'Turkish (Turkey)' },
  { value: 'uk-UA', label: 'Ukrainian (Ukraine)' },
  { value: 'ur-PK', label: 'Urdu (Pakistan)' },
  { value: 'vi-VN', label: 'Vietnamese (Vietnam)' },
  { value: 'zh-CN', label: 'Chinese Simplified (China)' },
  { value: 'zh-HK', label: 'Chinese Traditional (Hong Kong)' },
  { value: 'zh-TW', label: 'Chinese Traditional (Taiwan)' },
];

function formatTimeZoneLabel(timeZone: string): string {
  return timeZone.replace(/_/g, ' ');
}

function buildTimezoneOptions(): ProfileSelectionOption[] {
  const supportedValuesOf = (
    Intl as Intl.DateTimeFormatOptions & {
      supportedValuesOf?: (key: string) => string[];
    }
  ).supportedValuesOf;
  const zones =
    typeof supportedValuesOf === 'function' ? supportedValuesOf('timeZone') : FALLBACK_TIMEZONES;

  return zones.map((timeZone) => ({
    value: timeZone,
    label: formatTimeZoneLabel(timeZone),
  }));
}

function buildLocaleOptions(): ProfileSelectionOption[] {
  return [...LOCALE_CANDIDATES].sort((left, right) => left.label.localeCompare(right.label));
}

export const PROFILE_TIMEZONE_OPTIONS = buildTimezoneOptions();
export const PROFILE_LOCALE_OPTIONS = buildLocaleOptions();

export function getProfileSelectionLabel(
  options: ProfileSelectionOption[],
  value: string,
  fallbackLabel: string,
): string {
  return options.find((option) => option.value === value)?.label ?? fallbackLabel;
}
