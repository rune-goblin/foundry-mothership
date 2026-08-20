// One shared flash state, because two rows should never both claim to be the copy.

/** Long enough to register, short enough to feel like immediate confirmation. */
const FLASH_MS = 1000;

export function clipboard() {
  let copied = $state(null);
  let timer;

  return {
    get copied() {
      return copied;
    },
    copy(name) {
      navigator.clipboard?.writeText(name);
      copied = name;
      clearTimeout(timer);
      timer = setTimeout(() => (copied = null), FLASH_MS);
    },
  };
}
