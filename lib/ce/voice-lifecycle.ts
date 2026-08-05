type ReleasableAudioStream = Pick<MediaStream, "getTracks">;

const localAudioCleanups = new WeakMap<object, () => void>();

export function registerLocalAudioCleanup(
  stream: ReleasableAudioStream,
  cleanup: () => void
): void {
  localAudioCleanups.set(stream, cleanup);
}

export function hasRegisteredLocalAudioCleanup(
  stream: ReleasableAudioStream
): boolean {
  return localAudioCleanups.has(stream);
}

export function releaseLocalAudioStream(stream: ReleasableAudioStream): void {
  for (const track of stream.getTracks()) {
    track.stop();
  }

  const cleanup = localAudioCleanups.get(stream);
  localAudioCleanups.delete(stream);
  cleanup?.();
}

export function isCurrentVoiceLifecycle<T>(
  mounted: boolean,
  currentConnection: T | null,
  expectedConnection: T,
  currentGeneration: number,
  expectedGeneration: number
): boolean {
  return (
    mounted &&
    currentConnection === expectedConnection &&
    currentGeneration === expectedGeneration
  );
}
