import { describe, expect, it } from "vitest";

import { redactFreeText } from "@/lib/trends/redact";

describe("redactFreeText", () => {
  it("redacts emails", () => {
    expect(redactFreeText("Contact me at jane.doe+test@example.com please")).toBe(
      "Contact me at [redacted] please"
    );
  });

  it("redacts phone numbers in common formats", () => {
    expect(redactFreeText("Call (415) 555-0199 today")).toBe(
      "Call [redacted] today"
    );
    expect(redactFreeText("Reach +1 415-555-0198")).toBe("Reach [redacted]");
    expect(redactFreeText("Text 415 555 0197")).toBe("Text [redacted]");
  });

  it("redacts URLs and bare domains", () => {
    expect(redactFreeText("See https://example.com/path?x=1 for details")).toBe(
      "See [redacted] for details"
    );
    expect(redactFreeText("Visit www.example.org now")).toBe("Visit [redacted] now");
    expect(redactFreeText("Hosted on example.co.uk")).toBe("Hosted on [redacted]");
  });

  it("redacts @handles", () => {
    expect(redactFreeText("Message @tasker_jane about this")).toBe(
      "Message [redacted] about this"
    );
  });

  it("redacts long digit runs of 7 or more", () => {
    expect(redactFreeText("Card 4111111111111111 used")).toBe(
      "Card [redacted] used"
    );
    expect(redactFreeText("SSN-like 123456789")).toBe("SSN-like [redacted]");
    expect(redactFreeText("Short code 123456 is fine")).toBe(
      "Short code 123456 is fine"
    );
  });

  it("preserves sentiment and task words", () => {
    expect(
      redactFreeText("Late and rude cleaning job; professional plumber was great")
    ).toBe("Late and rude cleaning job; professional plumber was great");
  });

  it("does not treat ISO-like dates as phone numbers", () => {
    expect(redactFreeText("Service was late on 2026-04-01")).toBe(
      "Service was late on 2026-04-01"
    );
  });
});
