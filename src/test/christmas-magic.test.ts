import { describe, expect, it } from "vitest";
import { magicFlight } from "@/lib/christmas-magic";

describe("Christmas flyby paths", () => {
  it("enters and exits outside the screen toward the right", () => {
    const path = magicFlight(() => 0);
    expect(path.fromX).toBeLessThan(0);
    expect(path.toX).toBeGreaterThan(100);
    expect(path.duration).toBe(2600);
  });
  it("also crosses rapidly in the opposite direction", () => {
    const path = magicFlight(() => 0.9);
    expect(path.fromX).toBeGreaterThan(100);
    expect(path.toX).toBeLessThan(0);
    expect(path.reverse).toBe(true);
    expect(path.duration).toBeLessThan(3500);
  });
});