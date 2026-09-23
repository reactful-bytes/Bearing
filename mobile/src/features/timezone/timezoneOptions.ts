import type { SelectionOption } from '../../components/ui/SelectionModal';

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

function formatTimeZoneLabel(timeZone: string): string {
  return timeZone.replace(/_/g, ' ');
}

function buildTimezoneOptions(): SelectionOption[] {
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

export const TIMEZONE_OPTIONS = buildTimezoneOptions();
