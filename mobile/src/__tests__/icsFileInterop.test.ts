import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  buildIcsFilename,
  downloadIcsFileOnWeb,
  shareIcsExportFile,
  writeIcsExportFile,
} from '../features/calendar/icsFileInterop';
import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

jest.mock('expo-file-system', () => ({
  File: jest.fn(),
  Paths: { cache: 'cache-directory' },
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

const mockedFile = File as jest.MockedClass<typeof File>;
const mockedSharingAvailable = Sharing.isAvailableAsync as jest.MockedFunction<
  typeof Sharing.isAvailableAsync
>;
const mockedShare = Sharing.shareAsync as jest.MockedFunction<typeof Sharing.shareAsync>;

describe('icsFileInterop', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds a deterministic dated filename', () => {
    expect(buildIcsFilename(new Date(2026, 6, 31))).toBe('bearing-export-20260731.ics');
  });

  it('writes a native cache file and returns its URI', async () => {
    const create = jest.fn();
    const write = jest.fn();
    mockedFile.mockImplementation(
      () =>
        ({
          exists: false,
          create,
          write,
          uri: 'file:///cache/bearing-export.ics',
        }) as never,
    );

    await expect(writeIcsExportFile('bearing-export.ics', 'BEGIN:VCALENDAR')).resolves.toBe(
      'file:///cache/bearing-export.ics',
    );
    expect(mockedFile).toHaveBeenCalledWith('cache-directory', 'bearing-export.ics');
    expect(create).toHaveBeenCalledWith({ intermediates: true, overwrite: true });
    expect(write).toHaveBeenCalledWith('BEGIN:VCALENDAR');
  });

  it('shares native exports with calendar metadata when sharing is available', async () => {
    mockedSharingAvailable.mockResolvedValue(true);

    await expect(shareIcsExportFile('file:///cache/export.ics')).resolves.toBe(true);
    expect(mockedShare).toHaveBeenCalledWith('file:///cache/export.ics', {
      mimeType: 'text/calendar',
      UTI: 'public.calendar-event',
    });
  });

  it('returns false without opening native sharing when it is unavailable', async () => {
    mockedSharingAvailable.mockResolvedValue(false);

    await expect(shareIcsExportFile('file:///cache/export.ics')).resolves.toBe(false);
    expect(mockedShare).not.toHaveBeenCalled();
  });

  it('downloads on web and cleans up its temporary URL and anchor once', async () => {
    const originalBlob = Object.getOwnPropertyDescriptor(globalThis, 'Blob');
    const originalUrl = Object.getOwnPropertyDescriptor(globalThis, 'URL');
    const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
    const click = jest.fn();
    const remove = jest.fn();
    const appendChild = jest.fn();
    const removeChild = jest.fn();
    const createObjectURL = jest.fn(() => 'blob:bearing-export');
    const revokeObjectURL = jest.fn();
    const link = { click, remove, href: '', download: '' };
    const createElement = jest.fn(() => link);
    const BlobMock = jest.fn(() => ({ size: 10 }));

    Object.defineProperty(globalThis, 'Blob', { configurable: true, value: BlobMock });
    Object.defineProperty(globalThis, 'URL', {
      configurable: true,
      value: { createObjectURL, revokeObjectURL },
    });
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: { createElement, body: { appendChild, removeChild } },
    });

    try {
      await downloadIcsFileOnWeb('bearing-export.ics', 'BEGIN:VCALENDAR');
    } finally {
      if (originalBlob) Object.defineProperty(globalThis, 'Blob', originalBlob);
      else Reflect.deleteProperty(globalThis, 'Blob');
      if (originalUrl) Object.defineProperty(globalThis, 'URL', originalUrl);
      else Reflect.deleteProperty(globalThis, 'URL');
      if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
      else Reflect.deleteProperty(globalThis, 'document');
    }

    expect(BlobMock).toHaveBeenCalledWith(['BEGIN:VCALENDAR'], {
      type: 'text/calendar;charset=utf-8',
    });
    expect(link).toMatchObject({ href: 'blob:bearing-export', download: 'bearing-export.ics' });
    expect(appendChild).toHaveBeenCalledWith(link);
    expect(click).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(removeChild).not.toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:bearing-export');
  });
});
