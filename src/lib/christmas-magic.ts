import bellsGreeting from "@/assets/santa-bells-greeting.mp3.asset.json";
import merryGreeting from "@/assets/santa-merry-christmas.mp3.asset.json";

// Jingle Bells' public-domain background melody, synthesized locally.
const MELODY: [number, number][] = [
  [76,1],[76,1],[76,2],[76,1],[76,1],[76,2],[76,1],[79,1],[72,1.5],[74,.5],[76,4],
  [77,1],[77,1],[77,1.5],[77,.5],[77,1],[76,1],[76,1],[76,.5],[76,.5],[76,1],[74,1],[74,1],[76,1],[74,2],[79,2],
  [76,1],[76,1],[76,2],[76,1],[76,1],[76,2],[76,1],[79,1],[72,1.5],[74,.5],[76,4],
  [77,1],[77,1],[77,1],[77,1],[77,1],[76,1],[76,1],[76,.5],[76,.5],[79,1],[79,1],[77,1],[74,1],[72,4],
];

export function magicFlight(random = Math.random) {
  const reverse = random() > 0.5;
  return {
    fromX: reverse ? 120 : -45,
    toX: reverse ? -45 : 120,
    fromY: 12 + random() * 65,
    toY: 12 + random() * 65,
    reverse,
    duration: 2600 + random() * 900,
  };
}

// The two Merry Christmas uploads are byte-identical; do not weight that voice twice.
export const SANTA_RECORDINGS = [bellsGreeting.url, merryGreeting.url] as const;

export function createSantaGreetingShuffle(random = Math.random) {
  let remaining: number[] = [];
  let previous: number | undefined;
  return () => {
    if (remaining.length === 0) remaining = SANTA_RECORDINGS.map((_, index) => index);
    const candidates = remaining.filter(index => index !== previous);
    const pick = Math.min(candidates.length - 1, Math.max(0, Math.floor(random() * candidates.length)));
    const index = candidates[pick] ?? remaining[0] ?? 0;
    remaining = remaining.filter(value => value !== index);
    previous = index;
    return SANTA_RECORDINGS[index] ?? SANTA_RECORDINGS[0];
  };
}

// Approach the screen's center, then recede; never exceed device volume.
export function santaVolume(progress: number) {
  const proximity = Math.sin(Math.PI * Math.min(1, Math.max(0, progress)));
  return 0.25 + 0.75 * proximity * proximity;
}

export class ChristmasSound {
  private context: AudioContext | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private generation = 0;
  private loading: AbortController | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private voice: AudioBufferSourceNode | null = null;
  private voiceGain: GainNode | null = null;
  private nextGreeting = createSantaGreetingShuffle();

  async start() {
    this.stop();
    const generation = this.generation;
    const context = new AudioContext();
    this.context = context;
    await context.resume();
    if (this.generation !== generation || context.state !== "running") { this.stop(); return false; }
    const loading = new AbortController();
    this.loading = loading;
    const recordings = await Promise.all(SANTA_RECORDINGS.map(async url => {
      const cached = this.buffers.get(url);
      if (cached) return [url, cached] as const;
      const response = await fetch(url, { signal: loading.signal });
      if (!response.ok) throw new Error("Santa recording could not load");
      const buffer = await context.decodeAudioData(await response.arrayBuffer());
      return [url, buffer] as const;
    }));
    if (generation !== this.generation || context.state !== "running") return false;
    for (const [url, buffer] of recordings) this.buffers.set(url, buffer);
    this.loading = null;
    const phrase = () => {
      if (this.generation !== generation || context.state !== "running") return;
      let time = context.currentTime + 0.04;
      for (const [note, beats] of MELODY) {
        const duration = beats * 0.21;
        for (const harmonic of [1, 2.76]) {
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.type = "sine";
          oscillator.frequency.value = 440 * Math.pow(2, (note - 69) / 12) * harmonic;
          gain.gain.setValueAtTime(0, time);
          gain.gain.linearRampToValueAtTime(harmonic === 1 ? 0.045 : 0.012, time + 0.006);
          gain.gain.exponentialRampToValueAtTime(0.0001, time + Math.max(duration, 0.3));
          oscillator.connect(gain).connect(context.destination);
          oscillator.start(time); oscillator.stop(time + Math.max(duration, 0.3) + 0.05);
        }
        time += duration;
      }
      this.timer = setTimeout(phrase, (time - context.currentTime) * 1000);
    };
    phrase();
    return true;
  }

  greet(duration: number) {
    const context = this.context;
    if (!context || context.state !== "running" || document.hidden) return;
    const buffer = this.buffers.get(this.nextGreeting());
    if (!buffer) return;
    this.stopVoice();
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    source.connect(gain).connect(context.destination);
    const curve = Float32Array.from({ length: 65 }, (_, index) => santaVolume(index / 64));
    gain.gain.setValueCurveAtTime(curve, context.currentTime, Math.max(0.1, duration / 1000));
    this.voice = source;
    this.voiceGain = gain;
    source.onended = () => {
      source.disconnect(); gain.disconnect();
      if (this.voice === source) { this.voice = null; this.voiceGain = null; }
    };
    source.start();
  }

  private stopVoice() {
    if (this.voice) {
      this.voice.onended = null;
      try { this.voice.stop(); } catch { /* Already ended. */ }
      this.voice.disconnect();
      this.voice = null;
    }
    this.voiceGain?.disconnect();
    this.voiceGain = null;
  }

  stop() {
    this.generation++;
    clearTimeout(this.timer);
    this.loading?.abort();
    this.loading = null;
    this.stopVoice();
    if (this.context && this.context.state !== "closed") void this.context.close().catch(() => {});
    this.context = null;
  }
}