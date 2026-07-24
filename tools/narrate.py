#!/usr/bin/env python3
"""Render Watch-episode narration snippets with edge-tts (free, keyless).

Usage:
  python3 tools/narrate.py app/data/watch/u08-fractions.json           render missing/changed
  python3 tools/narrate.py app/data/watch/u08-fractions.json --force   re-render everything
  python3 tools/narrate.py app/data/watch/u08-fractions.json --check   offline validation only

The episode JSON is the single source of truth. Rendering writes one MP3 per
step next to the JSON (<json-dir>/<step.audio>) and stamps durationSec and
srcHash back into the JSON, so unchanged steps are skipped on the next run.

Rendering needs network access (edge-tts talks to Microsoft's TTS endpoint);
--check runs fully offline. Scene-directive validation lives in the browser
test suite (app/js/engine/watch.js validateEpisode); --check covers the
file-level side the browser cannot see: files exist and are non-empty,
durations are stamped, and no step's text changed since its MP3 was rendered.

Duration note: edge-tts emits 24 kHz 48 kbit/s mono CBR MP3, so duration is
estimated as filesize * 8 / 48000 (accurate to ~one MP3 frame). This keeps
edge-tts the only pip dependency (no mutagen).

Dependency: pip install edge-tts
"""

import argparse
import asyncio
import hashlib
import json
import pathlib
import sys
import time

ATTEMPTS = 8          # edge-tts drops connections when hammered; retry with backoff
BITRATE = 48000       # bits/s of edge-tts MP3 output (duration estimate)
PAUSE_BETWEEN = 0.4   # politeness pause between snippet renders (seconds)


def src_hash(voice: str, rate: str, text: str) -> str:
    return hashlib.sha1(f"{voice}|{rate}|{text}".encode("utf-8")).hexdigest()


async def synth(text: str, voice: str, rate: str, out_path: pathlib.Path) -> None:
    import edge_tts  # imported lazily so --check works without the package
    last = None
    for i in range(ATTEMPTS):
        try:
            await edge_tts.Communicate(text, voice, rate=rate).save(str(out_path))
            if out_path.exists() and out_path.stat().st_size > 0:
                return
            raise RuntimeError("empty audio output")
        except Exception as exc:  # noqa: BLE001 - network layer throws many types
            last = exc
            if i < ATTEMPTS - 1:
                await asyncio.sleep(1.2 * (i + 1))
    raise RuntimeError(f"edge-tts: synthesis failed after {ATTEMPTS} attempts: {last}")


def check(ep: dict, base: pathlib.Path) -> list[str]:
    errs: list[str] = []
    for field in ("id", "title", "unit", "topicIds", "voices", "speakers", "steps"):
        if not ep.get(field):
            errs.append(f"missing {field}")
    voices = ep.get("voices", {})
    speakers = ep.get("speakers", {})
    rate = ep.get("rate", "+0%")
    seen: set[str] = set()
    for i, st in enumerate(ep.get("steps", [])):
        where = f"step {st.get('id') or '#' + str(i)}"
        sid = st.get("id")
        if not sid:
            errs.append(f"{where}: missing id")
        elif sid in seen:
            errs.append(f"{where}: duplicate id")
        else:
            seen.add(sid)
        spk = st.get("speaker")
        if spk not in voices:
            errs.append(f"{where}: speaker {spk!r} not in voices")
        if spk not in speakers:
            errs.append(f"{where}: speaker {spk!r} not in speakers")
        if not (st.get("text") or "").strip():
            errs.append(f"{where}: empty text")
        audio = st.get("audio")
        if not audio:
            errs.append(f"{where}: missing audio path")
            continue
        path = base / audio
        if not path.exists() or path.stat().st_size == 0:
            errs.append(f"{where}: audio file missing or empty ({audio}) — run a render")
            continue
        if not st.get("durationSec"):
            errs.append(f"{where}: durationSec not stamped — run a render")
        if spk in voices and st.get("srcHash") != src_hash(voices[spk], rate, st["text"]):
            errs.append(f"{where}: text changed since last render (stale MP3) — run a render")
    return errs


async def render(ep: dict, base: pathlib.Path, ep_path: pathlib.Path, force: bool) -> None:
    voices = ep["voices"]
    rate = ep.get("rate", "+0%")
    rendered = skipped = 0
    for st in ep["steps"]:
        voice = voices[st["speaker"]]
        want = src_hash(voice, rate, st["text"])
        out = base / st["audio"]
        if not force and st.get("srcHash") == want and out.exists() and out.stat().st_size > 0:
            skipped += 1
            continue
        out.parent.mkdir(parents=True, exist_ok=True)
        print(f"  render {st['id']}  [{st['speaker']}] {st['text'][:52]}…")
        await synth(st["text"], voice, rate, out)
        st["durationSec"] = round(out.stat().st_size * 8 / BITRATE, 2)
        st["srcHash"] = want
        # Stamp progress after every snippet so an aborted run loses nothing.
        ep_path.write_text(json.dumps(ep, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        rendered += 1
        time.sleep(PAUSE_BETWEEN)
    total = sum(s.get("durationSec", 0) for s in ep["steps"])
    print(f"done: {rendered} rendered, {skipped} up to date, total {total:.0f}s ({total / 60:.1f} min)")


def main() -> None:
    ap = argparse.ArgumentParser(description="Render Watch-episode narration with edge-tts")
    ap.add_argument("episode", help="path to the episode JSON (single source of truth)")
    ap.add_argument("--check", action="store_true", help="validate only (offline, no render)")
    ap.add_argument("--force", action="store_true", help="re-render all snippets")
    args = ap.parse_args()

    ep_path = pathlib.Path(args.episode)
    ep = json.loads(ep_path.read_text(encoding="utf-8"))
    base = ep_path.parent

    if args.check:
        errs = check(ep, base)
        for e in errs:
            print("ERROR:", e)
        n = len(ep.get("steps", []))
        total = sum(s.get("durationSec", 0) for s in ep.get("steps", []))
        print(f"{'FAIL' if errs else 'OK'}: {ep.get('id')} — {n} steps, "
              f"{total:.0f}s ({total / 60:.1f} min), {len(errs)} error(s)")
        sys.exit(1 if errs else 0)

    asyncio.run(render(ep, base, ep_path, args.force))


if __name__ == "__main__":
    main()
