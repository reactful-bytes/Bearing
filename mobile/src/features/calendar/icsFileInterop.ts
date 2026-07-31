import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

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
  FileReader?: new () => {
    result: string | ArrayBuffer | null;
    error: Error | null;
    onload: null | (() => void);
    onerror: null | (() => void);
    readAsText: (file: unknown) => void;
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

function readWebFileAsText(file: unknown): Promise<string> {
  const globals = getWebGlobals();
  if (!globals.FileReader) {
    throw new Error('Web file reading is unavailable in this environment.');
  }

  const FileReaderConstructor = globals.FileReader;

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReaderConstructor();

    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '');
    };

    reader.onerror = () => {
      reject(reader.error ?? new Error('Failed to read the selected .ics file.'));
    };

    reader.readAsText(file);
  });
}

function pickWebIcsFileContent(): Promise<string | null> {
  const globals = getWebGlobals();

  if (!globals.document?.createElement) {
    throw new Error('Web file selection is unavailable in this environment.');
  }

  return new Promise<string | null>((resolve, reject) => {
    const input = globals.document?.createElement('input') as {
      accept?: string;
      type?: string;
      onchange?: (() => void) | null;
      files?: { length: number; item: (index: number) => unknown } | null;
      click: () => void;
      remove?: () => void;
    };

    input.type = 'file';
    input.accept = '.ics,text/calendar';
    input.onchange = async () => {
      try {
        const file = input.files?.length ? input.files.item(0) : null;
        const content = file ? await readWebFileAsText(file) : null;
        input.remove?.();
        resolve(content);
      } catch (error) {
        reject(
          error instanceof Error ? error : new Error('Failed to read the selected .ics file.'),
        );
      }
    };

    input.click();
  });
}

export async function pickIcsFileContent(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return pickWebIcsFileContent();
  }

  const result = await File.pickFileAsync({
    mimeTypes: ['text/calendar', 'application/octet-stream'],
  });
  if (result.canceled) {
    return null;
  }

  return result.result.text();
}
