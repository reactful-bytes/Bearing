import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

type WebGlobals = {
  Blob?: new (parts?: unknown[], options?: { type?: string }) => unknown;
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
};

function getWebGlobals(): WebGlobals {
  return globalThis as typeof globalThis & WebGlobals;
}

export function buildDataExportFilename(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `bearing-data-${year}${month}${day}.json`;
}

export function serializeDataExport(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export async function writeDataExportFile(filename: string, content: string): Promise<string> {
  const file = new File(Paths.cache, filename);
  if (!file.exists) file.create({ intermediates: true, overwrite: true });
  file.write(content);
  return file.uri;
}

export async function shareDataExportFile(uri: string): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(uri, { mimeType: 'application/json', UTI: 'public.json' });
  return true;
}

export async function downloadDataExportOnWeb(filename: string, content: string): Promise<void> {
  const globals = getWebGlobals();
  if (!globals.Blob || !globals.URL || !globals.document?.createElement) {
    throw new Error('Web file download is unavailable in this environment.');
  }

  const blob = new globals.Blob([content], { type: 'application/json;charset=utf-8' });
  const objectUrl = globals.URL.createObjectURL(blob);
  const link = globals.document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  globals.document.body?.appendChild(link);
  try {
    link.click();
  } finally {
    if (link.remove) link.remove();
    else globals.document.body?.removeChild(link);
    globals.URL.revokeObjectURL(objectUrl);
  }
}
