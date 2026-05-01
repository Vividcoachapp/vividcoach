import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { supabase } from './supabase';

export async function exportUserData(userId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('export-account-data');
  if (error) throw new Error(error.message);
  if (!data) throw new Error('No data returned from export.');

  const today = new Date().toISOString().slice(0, 10);
  const filename = `vividcoach-export-${today}.json`;
  const fileUri = (FileSystem.cacheDirectory ?? '') + filename;

  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(data, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('Sharing is not available on this device.');

  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/json',
    dialogTitle: 'Save your VividCoach data',
    UTI: 'public.json',
  });
}
