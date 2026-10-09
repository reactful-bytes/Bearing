const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { Buffer } = require('node:buffer');
const scriptDirectory = path.dirname(require.resolve('./generateNotificationSounds.js'));

const source = fs.readFileSync(
  path.resolve(scriptDirectory, '../src/features/profile/profileSounds.ts'),
  'utf8',
);
const parsed = ts.createSourceFile('profileSounds.ts', source, ts.ScriptTarget.Latest, true);
let options;
for (const statement of parsed.statements) {
  if (!ts.isVariableStatement(statement)) continue;
  for (const declaration of statement.declarationList.declarations) {
    if (declaration.name.getText(parsed) === 'PROFILE_SOUND_OPTIONS' && declaration.initializer) {
      options = vm.runInNewContext(`(${declaration.initializer.getText(parsed)})`, {});
    }
  }
}
if (!Array.isArray(options)) throw new Error('Profile sound options could not be read.');
const directory = path.resolve(scriptDirectory, '../assets/notification-sounds');
fs.mkdirSync(directory, { recursive: true });
for (const sound of options) {
  const sampleRate = 44100;
  const samples = sound.sequence.reduce(
    (count, segment) => count + Math.round((segment.durationMs * sampleRate) / 1000),
    0,
  );
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + samples * 2, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(samples * 2, 40);
  let index = 0;
  for (const segment of sound.sequence) {
    const length = Math.round((segment.durationMs * sampleRate) / 1000);
    const fade = Math.min(Math.floor(sampleRate * 0.008), Math.floor(length / 2));
    for (let local = 0; local < length; local += 1) {
      const envelope = fade ? Math.min(1, local / fade, (length - local) / fade) : 1;
      const value = segment.frequency
        ? Math.round(
            Math.sin((2 * Math.PI * segment.frequency * local) / sampleRate) *
              32767 *
              (segment.volume ?? 0.7) *
              envelope,
          )
        : 0;
      wav.writeInt16LE(value, 44 + index * 2);
      index += 1;
    }
  }
  fs.writeFileSync(path.join(directory, `${sound.id.replaceAll('-', '_')}.wav`), wav);
}
console.log(`Generated ${options.length} bundled reminder sounds.`);
