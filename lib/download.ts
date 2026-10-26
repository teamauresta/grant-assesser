/**
 * Saves a file in the browser. Client only. A string is wrapped in a Blob of `type`; a Blob is used
 * as it is.
 */
export function downloadFile(filename: string, data: Blob | string, type = 'application/octet-stream') {
  const blob = typeof data === 'string' ? new Blob([data], { type }) : data;
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  // Firefox ignores clicks on anchors that are not in the document.
  document.body.append(a);
  a.click();
  a.remove();
  // Revoking synchronously can cancel the download in some browsers (notably Safari and Firefox).
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
