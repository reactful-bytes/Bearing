import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

function getWebGlobals(): {
  Blob?: new (parts?: unknown[], options?: { type?: string }) => { readonly size: number };
  URL?: { createObjectURL: (blob: unknown) => string; revokeObjectURL: (url: string) => void };
  document?: {
    createElement: (tagName: string) => {
      click: () => void;
      href?: string;
      download?: string;
      remove?: () => void;
    };
    body?: { appendChild: (node: unknown) => void; removeChild: (node: unknown) => void };
  };
} {
  return globalThis as typeof globalThis & ReturnType<typeof getWebGlobals>;
}

export function buildIcsFilename(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `bearing-export-${year}${month}${day}.ics`;
}

export async function writeIcsExportFile(filename: string, content: string): Promise<string> {
  const file = new File(Paths.cache, filename);

  if (!file.exists) {
    file.create({ intermediates: true, overwrite: true });
  }

  file.write(content);
  return file.uri;
}

export async function shareIcsExportFile(uri: string): Promise<boolean> {
  const sharingAvailable = await Sharing.isAvailableAsync();
  if (!sharingAvailable) {
    return false;
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'text/calendar',
    UTI: 'public.calendar-event',
  });

  return true;
}

export async function downloadIcsFileOnWeb(filename: string, content: string): Promise<void> {
  const globals = getWebGlobals();

  if (!globals.Blob || !globals.URL || !globals.document?.createElement) {
    throw new Error('Web file download is unavailable in this environment.');
  }

  const blob = new globals.Blob([content], { type: 'text/calendar;charset=utf-8' });
  const objectUrl = globals.URL.createObjectURL(blob);
  const link = globals.document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  globals.document.body?.appendChild(link);
  link.click();
  link.remove?.();
  globals.document.body?.removeChild(link);
  globals.URL.revokeObjectURL(objectUrl);
}
