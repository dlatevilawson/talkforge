/**
 * Acoustic echo reference for Pro hands-free barge-in.
 *
 * Root cause we kept missing:
 * Forge TTS plays through an HTMLAudioElement on speakerphone. Browser
 * getUserMedia echoCancellation often does NOT cancel that path, so the mic
 * hears Forge as "human speech" (modulated, voice-band). Our local barge-in
 * detector then cancels Forge mid-sentence.
 *
 * Fix: treat the remote WebRTC playback stream as an AEC reference. Compare
 * mic vs remote *envelopes* (correlation is scale-invariant — digital remote
 * levels and physical mic levels are not on the same absolute scale). Only
 * yield when the mic clearly diverges upward from Forge's playback shape.
 */

export type EchoReferenceSample = {
  micLevel: number;
  remoteLevel: number;
};

/** Pearson correlation of two equal-length level envelopes in [0, 1]. */
export function envelopeCorrelation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 6) return 0;
  const ax = a.slice(a.length - n);
  const bx = b.slice(b.length - n);
  let meanA = 0;
  let meanB = 0;
  for (let i = 0; i < n; i += 1) {
    meanA += ax[i];
    meanB += bx[i];
  }
  meanA /= n;
  meanB /= n;
  let num = 0;
  let denA = 0;
  let denB = 0;
  for (let i = 0; i < n; i += 1) {
    const da = ax[i] - meanA;
    const db = bx[i] - meanB;
    num += da * db;
    denA += da * da;
    denB += db * db;
  }
  if (denA < 1e-8 || denB < 1e-8) return 0;
  return num / Math.sqrt(denA * denB);
}

/**
 * True when mic energy is explained by Forge speaker playback (echo),
 * not by a near-field user talking over Forge.
 *
 * Prefer envelope correlation over absolute mic/remote ratios — WebRTC
 * digital levels and physical mic levels live on different scales.
 */
export function isLikelyForgeEcho(input: {
  micLevel: number;
  remoteLevel: number;
  micHistory: number[];
  remoteHistory: number[];
}): boolean {
  const remote = input.remoteLevel;
  const mic = input.micLevel;
  if (remote < 0.04 || mic < 0.05) return false;

  const corr = envelopeCorrelation(input.micHistory, input.remoteHistory);

  // Mic envelope locked to Forge playback → classic speaker bleed.
  if (corr >= 0.65) return true;

  // Weaker correlation but mic still sits in a soft coupling band of remote.
  if (corr >= 0.4 && mic <= remote * 1.35 + 0.08) return true;

  return false;
}

/**
 * Barge-in while Forge audio is playing: require near-field talk-over
 * relative to the remote playback reference — not absolute mic energy alone.
 */
export function isConfirmedTalkOverBargeIn(input: {
  micLevel: number;
  remoteLevel: number;
  sustainedMs: number;
  modulation: number;
  speechBandRatio: number;
  micHistory: number[];
  remoteHistory: number[];
  minSustainMs?: number;
}): boolean {
  const minSustainMs = input.minSustainMs ?? 280;
  if (input.sustainedMs < minSustainMs) return false;

  // No remote audio yet → do not barge-in (avoids canceling during thinking).
  if (input.remoteLevel < 0.05) return false;

  if (
    isLikelyForgeEcho({
      micLevel: input.micLevel,
      remoteLevel: input.remoteLevel,
      micHistory: input.micHistory,
      remoteHistory: input.remoteHistory,
    })
  ) {
    return false;
  }

  const corr = envelopeCorrelation(input.micHistory, input.remoteHistory);
  // Still tracking Forge's shape → not a real talk-over.
  if (corr >= 0.55) return false;

  // Near-field presence: absolute floor (user at phone) plus residual above
  // a soft echo estimate. Residual uses a loose scale — correlation is primary.
  if (input.micLevel < 0.36) return false;
  const echoEstimate = input.remoteLevel * 0.85 + 0.06;
  if (input.micLevel < echoEstimate + 0.1) return false;

  // Still require speech-like shape so a door slam cannot yield the floor.
  if (input.modulation < 0.04) return false;
  if (input.speechBandRatio < 0.3) return false;

  return true;
}

/** Average level helper for analyser byte frequency data. */
export function levelFromFrequencyBins(bins: ArrayLike<number>): number {
  if (bins.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < bins.length; i += 1) sum += bins[i] ?? 0;
  return Math.min(1, (sum / (bins.length * 255)) * 2.4);
}
