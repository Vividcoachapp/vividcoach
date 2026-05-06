import Constants from 'expo-constants';

/** Returns the app version and build number formatted as "v{version} ({buildNumber})". */
export function getAppVersionString(): string {
  const expoConfig = Constants.expoConfig;

  const version = expoConfig?.version ?? 'unknown';

  const iosBuild = expoConfig?.ios?.buildNumber;
  const androidBuild = expoConfig?.android?.versionCode;

  const buildNumber =
    iosBuild ?? (androidBuild != null ? String(androidBuild) : undefined) ?? 'unknown';

  return `v${version} (${buildNumber})`;
}
