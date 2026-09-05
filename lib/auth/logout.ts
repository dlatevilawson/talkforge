/** Only drop local identity after the server confirms logout. */
export function logoutConfirmed(res: { ok: boolean }): boolean {
  return res.ok;
}
