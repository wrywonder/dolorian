/** One cache per authenticated identity. Old requests never populate a new account. */
export function createIdentityScopedLookup<T>(options: {
  resolveIdentity: () => Promise<string | null>;
  load: (userId: string) => Promise<T>;
}) {
  let identity: string | null | undefined;
  let revision = 0;
  let cached: { revision: number; value: T } | undefined;
  let pending: { revision: number; promise: Promise<T> } | undefined;
  let resolvingIdentity: Promise<string | null> | undefined;

  const accountChanged = () => new Error('Your account changed. Please try again.');

  function setIdentity(next: string | null) {
    if (identity === next) return;
    identity = next;
    revision += 1;
    cached = undefined;
    pending = undefined;
  }

  async function get(): Promise<T> {
    if (identity === undefined) {
      const beforeResolution = revision;
      const resolution = resolvingIdentity ??= options.resolveIdentity();
      let resolved: string | null;
      try {
        resolved = await resolution;
      } finally {
        if (resolvingIdentity === resolution) resolvingIdentity = undefined;
      }
      if (revision === beforeResolution) {
        setIdentity(resolved);
      } else if (revision !== beforeResolution + 1 || identity !== resolved) {
        // A matching INITIAL_SESSION event can race the first getUser call.
        // A sign-out/account switch during that call must reject its old result.
        throw accountChanged();
      }
    }
    if (!identity) throw new Error('Not authenticated');
    if (cached?.revision === revision) return cached.value;
    if (pending?.revision === revision) return pending.promise;

    const owner = identity;
    const requestRevision = revision;
    const promise = options.load(owner).then((value) => {
      if (revision !== requestRevision || identity !== owner) throw accountChanged();
      cached = { revision: requestRevision, value };
      return value;
    }).finally(() => {
      if (pending?.promise === promise) pending = undefined;
    });
    pending = { revision: requestRevision, promise };
    return promise;
  }

  return {
    get,
    setIdentity,
    peek: (): T | undefined => cached?.revision === revision ? cached.value : undefined,
  };
}
