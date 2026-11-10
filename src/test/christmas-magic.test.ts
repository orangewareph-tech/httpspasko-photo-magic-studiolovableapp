import { describe, expect, it } from "vitest";
import { createSantaGreetingShuffle, magicFlight, santaGreeting, santaVolume } from "@/lib/christmas-magic";

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

describe("Santa flyby greetings", () => {
  it("uses all three greetings every three passes without repeating at cycle boundaries", () => {
    for (const random of [() => 0, () => 0.4, () => 0.99]) {
      const next = createSantaGreetingShuffle(random);
      const phrases = Array.from({ length: 30 }, () => next().text);
      for (let i = 0; i < phrases.length; i += 3) {
        expect(new Set(phrases.slice(i, i + 3)).size).toBe(3);
      }
      for (let i = 1; i < phrases.length; i++) expect(phrases[i]).not.toBe(phrases[i - 1]);
    }
  });
  it("randomly selects each of the three requested phrases", () => {
    expect(santaGreeting(() => 0).text).toBe("Merry Christmas!");
    expect(santaGreeting(() => 0.4).text).toBe("Hohohoho!");
    expect(santaGreeting(() => 0.9).text).toBe("MERRY CHRISTMAS and a Happy new year!");
  });
  it("gets louder approaching the viewer and quieter leaving", () => {
    expect(santaVolume(0)).toBe(0.25);
    expect(santaVolume(0.25)).toBeCloseTo(0.625);
    expect(santaVolume(0.5)).toBe(1);
    expect(santaVolume(0.75)).toBeCloseTo(0.625);
    expect(santaVolume(1)).toBeCloseTo(0.25);
  });
  it("keeps volume safe outside a flyby's timeline", () => {
    expect(santaVolume(-1)).toBe(0.25);
    expect(santaVolume(2)).toBeCloseTo(0.25);
  });
});