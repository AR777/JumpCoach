import { Directory, File, Paths } from "expo-file-system";

export async function persistJumpVideo(sourceUri: string, id: string): Promise<string> {
  const dir = new Directory(Paths.document, "jumps");
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  const dest = new File(dir, `${id}.mp4`);
  if (dest.exists) dest.delete();
  const source = new File(sourceUri);
  await source.copy(dest);
  return dest.uri;
}
