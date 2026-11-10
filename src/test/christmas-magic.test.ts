import { describe, expect, it } from "vitest";
import { createSantaGreetingShuffle, magicFlight, SANTA_RECORDINGS, santaVolume } from "@/lib/christmas-magic";

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
  it("shuffles both distinct uploaded recordings without consecutive repeats", () => {
    for (const random of [() => 0, () => 0.4, () => 0.99]) {
      const next = createSantaGreetingShuffle(random);
      const phrases = Array.from({ length: 30 }, () => next());
      for (let i = 0; i < phrases.length; i += 2) {
        expect(new Set(phrases.slice(i, i + 2))).toEqual(new Set(SANTA_RECORDINGS));
      }
      for (let i = 1; i < phrases.length; i++) expect(phrases[i]).not.toBe(phrases[i - 1]);
    }
  });
  it("randomizes the first uploaded recording rather than weighting duplicate uploads", () => {
    expect(SANTA_RECORDINGS).toHaveLength(2);
    expect(createSantaGreetingShuffle(() => 0)()).toBe(SANTA_RECORDINGS[0]);
    expect(createSantaGreetingShuffle(() => 0.99)()).toBe(SANTA_RECORDINGS[1]);
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