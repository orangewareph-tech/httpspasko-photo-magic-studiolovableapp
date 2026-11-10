import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ChristmasMagic } from "@/components/brand/ChristmasMagic";

const sound = vi.hoisted(() => ({ start: vi.fn(async () => true), stop: vi.fn(), greet: vi.fn() }));
vi.mock("@/lib/christmas-magic", () => ({ ChristmasSound: class { start = sound.start; stop = sound.stop; greet = sound.greet; }, magicFlight: vi.fn() }));
vi.mock("@/components/brand/Snowfall", () => ({ Snowfall: () => null }));

afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals(); });

describe("Automatic Santa sound", () => {
  it("starts on the first page tap, not on page load, and respects manual mute", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    render(<ChristmasMagic />);
    expect(sound.start).not.toHaveBeenCalled();
    fireEvent.pointerUp(document.body);
    await waitFor(() => expect(sound.start).toHaveBeenCalledTimes(1));
    fireEvent.click(await screen.findByRole("button", { name: "Mute Christmas sounds" }));
    fireEvent.pointerUp(document.body);
    expect(sound.start).toHaveBeenCalledTimes(1);
    expect(sound.stop).toHaveBeenCalled();
  });
  it("does not automatically start while slideshow music is active", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    render(<ChristmasMagic />);
    fireEvent(window, new CustomEvent("pasko-slideshow-audio", { detail: true }));
    fireEvent.pointerUp(document.body);
    expect(sound.start).not.toHaveBeenCalled();
  });
});