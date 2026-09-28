/**
 * Efterliknar nätverkslatens så att vyerna byggs för att hantera väntan från
 * början. Håll den kort – den här fördröjningen känns i varje sidladdning.
 */
export function latency(ms = 80): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
