import { describe, expect, it, vi } from "vitest";

import {
  announceEmailVerified,
  listenForEmailVerified,
} from "./email-verified-channel";

describe("email verified channel", () => {
  it("tells a listening tab that the email was confirmed", async () => {
    const onVerified = vi.fn();
    const stopListening = listenForEmailVerified(onVerified);

    announceEmailVerified();

    await vi.waitFor(() => expect(onVerified).toHaveBeenCalledTimes(1));
    stopListening();
  });

  it("stops notifying a tab that stopped listening", async () => {
    const onVerified = vi.fn();
    const stopListening = listenForEmailVerified(onVerified);
    stopListening();

    announceEmailVerified();

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(onVerified).not.toHaveBeenCalled();
  });
});
