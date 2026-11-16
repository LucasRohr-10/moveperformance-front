const CHANNEL_NAME = "move-email-verified";

// The confirmation link opens in a new tab, so the tab where the user signed
// up never learns the email is confirmed. The new tab announces it here and
// the signup tab listens. Same browser only: another browser or a phone has
// no channel in common, and the signup tab simply stays as it was.
export function announceEmailVerified(): void {
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.postMessage("verified");
  channel.close();
}

export function listenForEmailVerified(onVerified: () => void): () => void {
  if (typeof BroadcastChannel === "undefined") return () => {};
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = onVerified;
  return () => channel.close();
}
