import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

/**
 * ffmpeg-Pipeline der ANALYZE-Phase.
 *
 * Videos werden in ein temporäres Verzeichnis gestreamt, Frames und
 * Audio extrahiert und das Original sofort verworfen (rm im finally).
 * Dauerhaft gespeichert werden ausschließlich WebP-Frames in Supabase
 * Storage.
 */

const FIXED_FRAME_SECONDS = [0, 1, 2, 3];

export interface MediaTools {
  ffmpeg: string;
  ffprobe: string;
}

export function resolveMediaTools(env: {
  FFMPEG_PATH?: string;
  FFPROBE_PATH?: string;
}): MediaTools {
  return {
    ffmpeg: env.FFMPEG_PATH ?? "ffmpeg",
    ffprobe: env.FFPROBE_PATH ?? "ffprobe",
  };
}

function run(
  command: string,
  args: string[],
  opts: { timeoutMs?: number } = {},
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${command} Timeout nach ${opts.timeoutMs}ms`));
    }, opts.timeoutMs ?? 120_000);
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve({ stdout, stderr });
      else
        reject(
          new Error(
            `${command} endete mit Code ${code}: ${stderr.slice(-400)}`,
          ),
        );
    });
  });
}

/**
 * pts_time-Werte aus ffmpeg-showinfo-Output parsen (Szenenwechsel).
 * Pur und ohne ffmpeg testbar.
 */
export function parseShowinfoTimes(stderr: string): number[] {
  const times: number[] = [];
  const regex = /pts_time:(\d+(?:\.\d+)?)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(stderr)) !== null) {
    times.push(Number.parseFloat(match[1]!));
  }
  return times;
}

/**
 * Frame-Zeitpunkte: fest 0/1/2/3 s plus Szenenwechsel, dedupliziert
 * (Mindestabstand 0,5 s), max. `maxFrames`, innerhalb der Videolänge.
 */
export function buildFrameTimestamps(
  durationSeconds: number,
  sceneTimes: number[],
  maxFrames = 8,
): number[] {
  const result: number[] = [];
  const isFar = (t: number) => result.every((r) => Math.abs(r - t) >= 0.5);

  for (const t of FIXED_FRAME_SECONDS) {
    if (t < durationSeconds && result.length < maxFrames && isFar(t)) {
      result.push(t);
    }
  }
  for (const t of [...sceneTimes].sort((a, b) => a - b)) {
    if (result.length >= maxFrames) break;
    if (t < durationSeconds && isFar(t)) result.push(t);
  }
  return result.sort((a, b) => a - b);
}

async function download(url: string, filePath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Video-Download fehlgeschlagen (${response.status})`);
  }
  await pipeline(
    Readable.fromWeb(response.body as import("node:stream/web").ReadableStream),
    createWriteStream(filePath),
  );
}

export interface ExtractedMedia {
  /** WebP-Frames in chronologischer Reihenfolge. */
  frames: { seconds: number; data: Buffer }[];
  /** 16-kHz-Mono-WAV für Whisper (null, wenn keine Tonspur). */
  audioWav: Buffer | null;
  durationSeconds: number;
}

/**
 * Lädt das Video temporär, extrahiert Frames (fest + Szenenwechsel,
 * max. 8, 512 px breit, WebP) und die Tonspur – und verwirft das
 * Original garantiert wieder.
 */
export async function extractMediaFromUrl(
  videoUrl: string,
  tools: MediaTools,
  opts: { maxFrames?: number; frameWidth?: number } = {},
): Promise<ExtractedMedia> {
  const maxFrames = opts.maxFrames ?? 8;
  const frameWidth = opts.frameWidth ?? 512;
  const dir = await mkdtemp(path.join(tmpdir(), "ci-media-"));
  const videoPath = path.join(dir, "video.mp4");

  try {
    await download(videoUrl, videoPath);

    const probe = await run(tools.ffprobe, [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "csv=p=0",
      videoPath,
    ]);
    const durationSeconds = Number.parseFloat(probe.stdout.trim()) || 0;

    let sceneTimes: number[] = [];
    try {
      const sceneOutput = await run(tools.ffmpeg, [
        "-i",
        videoPath,
        "-vf",
        "select='gt(scene,0.3)',showinfo",
        "-f",
        "null",
        "-",
      ]);
      sceneTimes = parseShowinfoTimes(sceneOutput.stderr);
    } catch {
      // Szenen-Erkennung ist optional – feste Frames genügen.
    }

    const timestamps = buildFrameTimestamps(
      durationSeconds || 4,
      sceneTimes,
      maxFrames,
    );

    const frames: { seconds: number; data: Buffer }[] = [];
    for (const [index, seconds] of timestamps.entries()) {
      const framePath = path.join(dir, `frame-${index}.webp`);
      try {
        await run(tools.ffmpeg, [
          "-ss",
          seconds.toFixed(2),
          "-i",
          videoPath,
          "-frames:v",
          "1",
          "-vf",
          `scale=${frameWidth}:-2`,
          "-y",
          framePath,
        ]);
        frames.push({ seconds, data: await readFile(framePath) });
      } catch {
        // Einzelner Frame-Fehler (z. B. hinter Videoende) ist tolerierbar.
      }
    }

    let audioWav: Buffer | null = null;
    const audioPath = path.join(dir, "audio.wav");
    try {
      await run(tools.ffmpeg, [
        "-i",
        videoPath,
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-c:a",
        "pcm_s16le",
        "-y",
        audioPath,
      ]);
      audioWav = await readFile(audioPath);
    } catch {
      audioWav = null; // Video ohne Tonspur
    }

    return { frames, audioWav, durationSeconds };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Bild-URL (Thumbnail) → einzelner WebP-Frame. */
export async function imageUrlToWebp(
  imageUrl: string,
  tools: MediaTools,
  frameWidth = 512,
): Promise<Buffer> {
  const dir = await mkdtemp(path.join(tmpdir(), "ci-img-"));
  const inputPath = path.join(dir, "input");
  const outputPath = path.join(dir, "out.webp");
  try {
    await download(imageUrl, inputPath);
    await run(tools.ffmpeg, [
      "-i",
      inputPath,
      "-vf",
      `scale=${frameWidth}:-2`,
      "-y",
      outputPath,
    ]);
    return await readFile(outputPath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
