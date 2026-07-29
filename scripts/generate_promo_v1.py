#!/usr/bin/env python3
"""Promo V1 — generate from Prompt Bible (FILM-PB-001), assemble per Edit Plan."""
from __future__ import annotations

import json
import os
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path

API = "https://api.openai.com/v1"
KEY = os.environ["OPENAI_API_KEY"]
ROOT = Path("/workspace/tmp/hero-film-promo-v1")
RAW = ROOT / "raw"
CLIPS = ROOT / "clips"
OUT = Path("/workspace/public/video")
RAW.mkdir(parents=True, exist_ok=True)
CLIPS.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)

MODEL = "sora-2"
SIZE = "1280x720"
SECONDS = "8"

LOOK = (
    "Cinematic realism, premium brand film, photorealistic, natural window or practical lamp light, "
    "warm blacks, soft golden highlights, shallow depth of field, slow deliberate camera movement, "
    "understated performance, no exaggerated acting, no spoken dialogue, no on-screen text, no logos, "
    "no holograms, no futuristic UI glow, no sci-fi effects, no neon, human-first storytelling, 16:9."
)

# Paired / single generations mapped to edit plates (Edit Plan pairing guide)
PLATES = [
    {
        "id": "P01_maya_freeze",  # S01+S02 continuous
        "shots": "S01-S02",
        "prompt": (
            f"{LOOK} Maya: East Asian woman late twenties, professional attire, dark shoulder-length hair. "
            "Modern bright conference room, soft daylight through glass. Medium close-up at eye level. "
            "She inhales, chin lifts slightly about to speak, then eyes flicker with doubt, mouth closes, "
            "hands settle. Slow push-in throughout. Quiet possibility becoming hesitation. No dialogue, no text."
        ),
    },
    {
        "id": "P02_maya_cost",  # S03+S04
        "shots": "S03-S04",
        "prompt": (
            f"{LOOK} Same Maya East Asian woman late twenties in a modern conference room. "
            "Wider then closer: a confident colleague speaks while others nod; Maya watches from the edge. "
            "Then extreme close-up on Maya's eyes receiving quiet aftermath. Cost of silence. "
            "Natural daylight, understated. No dialogue, no text."
        ),
    },
    {
        "id": "P03_jordan_freeze",  # S05+S06
        "shots": "S05-S06",
        "prompt": (
            f"{LOOK} Jordan: Black man late twenties at a warm family dinner table at home, soft lamp light. "
            "Medium close-up. He looks at his parents with resolve forming, opens his mouth to share news "
            "about marrying the woman he loves, then stops, forces a small smile, changes subject. "
            "Disappointment in his eyes. Slow push-in. No dialogue, no text."
        ),
    },
    {
        "id": "P04_ava_freeze",  # S07+S08
        "shots": "S07-S08",
        "prompt": (
            f"{LOOK} Ava: young woman about twenty (adult), university-casual clothes, open face. "
            "Sunlit university campus walkway. She watches friends laughing, steps toward them to introduce "
            "herself, loses courage, looks down, keeps walking alone. Subtle handheld then she moves on. "
            "Longing then the walk of almost. No minors. No dialogue, no text."
        ),
    },
    {
        "id": "P05_night",  # S09-S11 compressed into one plate for promo runtime
        "shots": "S09-S11",
        "prompt": (
            f"{LOOK} Late night montage feeling: three quiet homes, warm lamps. "
            "Maya on bed edge with phone, thoughtful searching; Jordan at kitchen table with laptop showing "
            "a calm minimal practice interface secondary to his face; Ava on couch practicing a soft greeting "
            "to herself. Peaceful, trustworthy, human. Slow dissolves between rooms. No logos, no dialogue, no text."
        ),
    },
    {
        "id": "P06_practice",  # S12-S14
        "shots": "S12-S14",
        "prompt": (
            f"{LOOK} Training montage: Maya, Jordan, and Ava each practicing alone in quiet rooms — "
            "rehearsing, pausing, trying again. Morning-soft light arriving. Growing calm confidence in posture "
            "and eyes. Parallel lives, emotion over interface. Work not magic. No dialogue, no text."
        ),
    },
    {
        "id": "P07_resolution",  # S15-S17
        "shots": "S15-S17",
        "prompt": (
            f"{LOOK} Resolution montage: Maya calmly presents an idea in a meeting and colleagues listen; "
            "Jordan tells his family about the woman he loves and they smile and embrace him; "
            "Ava on campus introduces herself and another student smiles as they walk away together. "
            "Warm golden light, earned relief not swagger. No dialogue, no text."
        ),
    },
    {
        "id": "P08_hope",  # S18-S19
        "shots": "S18-S19",
        "prompt": (
            f"{LOOK} Quiet everyday moment: one of our adults shares a calm human recommendation with someone "
            "struggling — small gesture, not salesy. Then intimate close-up of a new adult who has just "
            "discovered hope — soft eyes, quiet relief, almost a smile. Hold. Natural window light, "
            "extremely shallow depth of field. No dialogue, no text."
        ),
    },
]


def req(method: str, path: str, body: dict | None = None, binary: bool = False):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Authorization": f"Bearer {KEY}"}
    if body is not None:
        headers["Content-Type"] = "application/json"
    if binary:
        headers["Accept"] = "application/binary"
    r = urllib.request.Request(f"{API}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=300) as resp:
            raw = resp.read()
            return raw if binary else json.loads(raw.decode())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"{method} {path} -> {e.code}: {e.read().decode()}") from e


def create(plate: dict) -> str:
    meta_path = RAW / f"{plate['id']}.json"
    if meta_path.exists():
        meta = json.loads(meta_path.read_text())
        if meta.get("id") and meta.get("status") != "failed":
            print(f"resume {plate['id']}: {meta['id']}", flush=True)
            return meta["id"]
    print(f"create {plate['id']} ({plate['shots']})...", flush=True)
    res = req(
        "POST",
        "/videos",
        {"model": MODEL, "prompt": plate["prompt"], "seconds": SECONDS, "size": SIZE},
    )
    meta_path.write_text(json.dumps({**res, "plate": plate["id"], "shots": plate["shots"]}, indent=2))
    print(f"  -> {res['id']}", flush=True)
    return res["id"]


def poll(video_id: str, plate_id: str, timeout_s: int = 1500) -> dict:
    meta_path = RAW / f"{plate_id}.json"
    start = time.time()
    while True:
        res = req("GET", f"/videos/{video_id}")
        prev = {}
        if meta_path.exists():
            prev = json.loads(meta_path.read_text())
        meta_path.write_text(json.dumps({**prev, **res, "plate": plate_id}, indent=2))
        print(f"  poll {plate_id}: {res.get('status')} {res.get('progress')}%", flush=True)
        if res.get("status") == "completed":
            return res
        if res.get("status") == "failed":
            raise RuntimeError(f"{plate_id} failed: {res.get('error')}")
        if time.time() - start > timeout_s:
            raise TimeoutError(plate_id)
        time.sleep(15)


def download(video_id: str, plate_id: str) -> Path:
    out = CLIPS / f"{plate_id}.mp4"
    if out.exists() and out.stat().st_size > 100_000:
        print(f"have {out}", flush=True)
        return out
    print(f"download {plate_id}...", flush=True)
    data = req("GET", f"/videos/{video_id}/content?variant=video", binary=True)
    out.write_bytes(data)
    print(f"  wrote {out} ({len(data)})", flush=True)
    return out


def assemble(paths: list[Path]) -> Path:
    trim = ROOT / "trim"
    trim.mkdir(exist_ok=True)
    # Promo runtime: ~5s per plate × 8 = 40s + 3s title
    trims = []
    for i, p in enumerate(paths):
        dst = trim / f"{i:02d}.mp4"
        subprocess.check_call(
            [
                "ffmpeg", "-y", "-ss", "1.0", "-i", str(p), "-t", "5",
                "-vf", "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=24",
                "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
                str(dst),
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        trims.append(dst)

    font = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    title = trim / "title.mp4"
    subprocess.check_call(
        [
            "ffmpeg", "-y", "-f", "lavfi", "-i", "color=c=0x050505:s=1280x720:d=3",
            "-vf",
            (
                f"drawtext=fontfile={font}:text='Find Your Voice.':fontcolor=0xF7E3B0:fontsize=52:"
                f"x=(w-text_w)/2:y=(h-text_h)/2-36,"
                f"drawtext=fontfile={font}:text='TalkForge':fontcolor=0xC99B4A:fontsize=34:"
                f"x=(w-text_w)/2:y=(h-text_h)/2+36"
            ),
            "-c:v", "libx264", "-pix_fmt", "yuv420p", str(title),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    trims.append(title)

    lst = trim / "concat.txt"
    lst.write_text("".join(f"file '{p}'\n" for p in trims))
    joined = trim / "joined.mp4"
    subprocess.check_call(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(joined)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    dur = float(
        subprocess.check_output(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", str(joined)],
            text=True,
        ).strip()
    )
    fade_start = max(0, dur - 1.8)
    final = OUT / "hero.mp4"
    subprocess.check_call(
        [
            "ffmpeg", "-y", "-i", str(joined),
            "-vf",
            (
                f"eq=contrast=1.06:brightness=-0.025:saturation=0.92,"
                f"colorbalance=rs=.05:gs=.02:bs=-.04:rm=.03:gm=.01:bm=-.02,"
                f"fade=t=in:st=0:d=0.8,fade=t=out:st={fade_start}:d=1.8"
            ),
            "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "23",
            "-movflags", "+faststart", "-pix_fmt", "yuv420p", str(final),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    master = OUT / "hero-master.mp4"
    subprocess.check_call(
        [
            "ffmpeg", "-y", "-i", str(joined),
            "-vf",
            (
                f"eq=contrast=1.06:brightness=-0.025:saturation=0.92,"
                f"colorbalance=rs=.05:gs=.02:bs=-.04:rm=.03:gm=.01:bm=-.02,"
                f"fade=t=in:st=0:d=0.8,fade=t=out:st={fade_start}:d=1.8"
            ),
            "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "17",
            "-movflags", "+faststart", "-pix_fmt", "yuv420p", str(master),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    poster = OUT / "hero-poster.jpg"
    hope = CLIPS / "P08_hope.mp4"
    src = hope if hope.exists() else final
    subprocess.check_call(
        ["ffmpeg", "-y", "-ss", "2", "-i", str(src), "-frames:v", "1", "-q:v", "3", str(poster)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    print(f"FINAL {final} ({final.stat().st_size}) dur={dur:.1f}s", flush=True)
    return final


def main():
    ids = {}
    for plate in PLATES:
        try:
            ids[plate["id"]] = create(plate)
        except Exception as e:
            print(f"CREATE FAIL {plate['id']}: {e}", flush=True)
            # Safer night/practice fallbacks if moderation hits
            if plate["id"] == "P05_night":
                plate = {
                    **plate,
                    "prompt": (
                        f"{LOOK} Late evening. Three quiet adult homes with warm lamps. "
                        "A woman on a bed edge looking thoughtfully at a phone; a man at a kitchen table "
                        "with a laptop; a young woman on a couch practicing speaking softly alone. "
                        "Calm, hopeful, human. No drama. No logos. No dialogue, no text."
                    ),
                }
                ids[plate["id"]] = create(plate)
            else:
                raise
        time.sleep(1.2)

    paths = []
    for plate in PLATES:
        vid = ids[plate["id"]]
        try:
            poll(vid, plate["id"])
        except RuntimeError as e:
            if "moderation" in str(e).lower() or "failed" in str(e).lower():
                print(f"RETRY safer {plate['id']}", flush=True)
                safer = plate["prompt"].replace("hard conversations", "confidence").replace("marrying", "sharing love for")
                res = req("POST", "/videos", {"model": MODEL, "prompt": safer, "seconds": SECONDS, "size": SIZE})
                (RAW / f"{plate['id']}.json").write_text(json.dumps({**res, "plate": plate["id"]}, indent=2))
                poll(res["id"], plate["id"])
                vid = res["id"]
            else:
                raise
        paths.append(download(vid, plate["id"]))

    assemble(paths)


if __name__ == "__main__":
    main()
