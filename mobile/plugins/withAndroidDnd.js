/* global __dirname */

const fs = require('node:fs/promises');
const path = require('node:path');

const { withDangerousMod, withMainApplication } = require('@expo/config-plugins');

const PACKAGE_REGISTRATION = 'add(BearingDndPackage())';
const MAIN_APPLICATION_ANCHOR = 'PackageList(this).packages.apply {';
const TEMPLATE_DIRECTORY = path.join(__dirname, 'android');

function registerDndPackage(contents) {
  if (contents.includes(PACKAGE_REGISTRATION)) {
    return contents;
  }

  if (!contents.includes(MAIN_APPLICATION_ANCHOR)) {
    throw new Error('Unable to register BearingDndPackage in the generated MainApplication.');
  }

  return contents.replace(
    MAIN_APPLICATION_ANCHOR,
    `${MAIN_APPLICATION_ANCHOR}\n          ${PACKAGE_REGISTRATION}`,
  );
}

async function writeNativeSources(platformProjectRoot, packageName) {
  const packageDirectory = path.join(
    platformProjectRoot,
    'app',
    'src',
    'main',
    'java',
    ...packageName.split('.'),
  );
  await fs.mkdir(packageDirectory, { recursive: true });

  for (const filename of ['BearingDndModule.kt', 'BearingDndPackage.kt']) {
    const template = await fs.readFile(path.join(TEMPLATE_DIRECTORY, filename), 'utf8');
    const contents = template.replaceAll('__PACKAGE_NAME__', packageName);
    await fs.writeFile(path.join(packageDirectory, filename), contents);
  }
}

module.exports = function withAndroidDnd(config) {
  const packageName = config.android?.package;
  if (!packageName) {
    throw new Error('Bearing Android package name is required for the DND native module.');
  }

  config = withMainApplication(config, (mainApplicationConfig) => {
    if (mainApplicationConfig.modResults.language !== 'kt') {
      throw new Error('BearingDndPackage registration requires a Kotlin MainApplication.');
    }

    mainApplicationConfig.modResults.contents = registerDndPackage(
      mainApplicationConfig.modResults.contents,
    );
    return mainApplicationConfig;
  });

  return withDangerousMod(config, [
    'android',
    async (dangerousModConfig) => {
      await writeNativeSources(dangerousModConfig.modRequest.platformProjectRoot, packageName);
      return dangerousModConfig;
    },
  ]);
};
