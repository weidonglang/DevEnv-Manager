export function fileDirectory(path: string, directory?: string) {
  return directory || path.replace(/[\\/][^\\/]*$/, "");
}
