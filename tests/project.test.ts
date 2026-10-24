import { describe, expect, test } from "bun:test";
import { JOURNEYS } from "../src/journeys.js";

const root = new URL("../", import.meta.url);

describe("journey configuration", () => {
  test("journeys have unique IDs and valid playback settings", () => {
    expect(new Set(JOURNEYS.map(journey => journey.id)).size).toBe(JOURNEYS.length);
    for (const journey of JOURNEYS) {
      expect(journey.videoId).toMatch(/^[A-Za-z0-9_-]{11}$/);
      expect(journey.startSeconds).toBeGreaterThanOrEqual(0);
      expect(() => new Intl.DateTimeFormat("en", { timeZone: journey.timezone })).not.toThrow();
    }
  });

  test("timelines are ordered and spoken events have subtitles", () => {
    for (const journey of JOURNEYS) {
      let previous = -1;
      for (const event of journey.stops) {
        expect(event.at).toBeGreaterThanOrEqual(previous);
        expect(event.at).toBeGreaterThanOrEqual(0);
        previous = event.at;
        if (event.type === "stop") expect(event.duration).toBeGreaterThan(0);
        else {
          expect(event.text).toBeTruthy();
          expect(event.subtitle).toBeTruthy();
        }
      }
    }
  });
});

describe("separate source and image files", () => {
  test("every journey has a real JPEG with a valid file signature", async () => {
    for (const journey of JOURNEYS) {
      const bytes = new Uint8Array(await Bun.file(new URL(`assets/images/${journey.image}.jpg`, root)).arrayBuffer());
      expect([...bytes.slice(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
      expect(bytes.length).toBeGreaterThan(1000);
    }
  });

  test("HTML loads external source files instead of embedding code", async () => {
    const html = await Bun.file(new URL("index.html", root)).text();
    expect(html).toContain('href="./src/styles.css"');
    expect(html).toContain('type="module" src="./src/main.js"');
    expect(html).not.toMatch(/<style[\s>]/);
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/);
    expect(html.length).toBeLessThan(20000);
  });

  test("source files contain no inline image payloads", async () => {
    const files = ["index.html", ...Array.from(new Bun.Glob("src/**/*.{js,css}").scanSync({ cwd: root.pathname }))];
    for (const file of files) {
      const source = await Bun.file(new URL(file, root)).text();
      expect(source).not.toMatch(/data:image\/[^;]+;base64,/);
    }
  });
});
