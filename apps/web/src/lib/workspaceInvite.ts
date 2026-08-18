export function normalizeInviteCode(value: string) {
  const input = value.trim();
  if (!input) return '';

  try {
    const url = new URL(input);
    const marker = '/co-space/join/';
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex >= 0) {
      return decodeURIComponent(url.pathname.slice(markerIndex + marker.length).split('/')[0]);
    }
  } catch {
    // The input may be a raw invite code rather than a URL.
  }

  return decodeURIComponent(input.split(/[/?#]/)[0]);
}
