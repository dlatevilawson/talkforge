#!/usr/bin/env python3
"""TalkForge Hero Film V1 — generate Sora clips, poll, download, assemble."""
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
ROOT = Path("/workspace/tmp/hero-film")
RAW = ROOT / "raw"
CLIPS = ROOT / "clips"
OUT = Path("/workspace/public/video")
RAW.mkdir(parents=True, exist_ok=True)
CLIPS.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)

MODEL = "sora-2"
SIZE = "1280x720"
SECONDS = "8"

# Shared look bible baked into every prompt
LOOK = (
    "Cinematic realism, premium brand film, natural window light, warm blacks, "
    "soft golden highlights, shallow depth of field, slow deliberate camera movement, "
    "intimate close-ups on faces and hands, photorealistic environments, "
    "understated performance no exaggerated acting, no dialogue, no on-screen text, "
    "no logos, no holograms, no futuristic UI glow, no sci-fi effects, 16:9."
)

SCENES = [
    {
        "id": "01_missed",
        "prompt": (
            f"{LOOK} Young professional East Asian woman in her late twenties in a bright modern "
            "conference room. Medium close-up: she inhales, starts to raise her hand to speak, "
            "then hesitates, eyes lowering. Across the table a confident colleague speaks instead; "
            "others nod. Cut feeling: quiet disappointment. Slow push-in on her face."
        ),
    },
    {
        "id": "02_love",
        "prompt": (
            f"{LOOK} Young Black man in his late twenties at a warm family dinner table at home. "
            "Soft lamp light. He looks at his parents, opens his mouth to share news about wanting "
            "to marry the woman he loves, then stops, forces a small smile, changes subject. "
            "His disappointment is visible in his eyes. Slow lateral move, shallow focus."
        ),
    },
    {
        "id": "03_belonging",
        "prompt": (
            f"{LOOK} Young woman about twenty on a sunlit university campus walkway. She watches "
            "a group of friends laughing nearby. She takes a step toward them to introduce herself, "
            "loses courage, looks down, and keeps walking alone. Handheld subtle, emotional restraint."
        ),
    },
    {
        "id": "04_night",
        "prompt": (
            f"{LOOK} Late night montage energy in one continuous feel: three quiet homes, warm "
            "practical lamps, people searching on a phone or laptop for help with confidence and "
            "hard conversations. Calm trustworthy product presence on screen as a simple clean "
            "practice app interface, minimal UI, human-first, no magic effects. Slow dissolves between rooms."
        ),
    },
    {
        "id": "05_practice",
        "prompt": (
            f"{LOOK} Training montage: same three adults practicing speaking alone in quiet rooms — "
            "rehearsing, pausing, reflecting, trying again. Growing calm confidence in posture and eyes. "
            "Split-screen feeling with parallel lives. Emotion over interface. Soft morning light arriving."
        ),
    },
    {
        "id": "06_resolution",
        "prompt": (
            f"{LOOK} Resolution montage: the woman confidently presents an idea in a meeting and the room "
            "listens; the young man tells his family about the woman he loves and they smile and embrace him; "
            "the young woman on campus introduces herself and another student smiles as they walk away together. "
            "Warm golden light, earned confidence, hope."
        ),
    },
    {
        "id": "07_hope",
        "prompt": (
            f"{LOOK} Final intimate close-up of a new person who has just discovered hope — soft eyes, "
            "quiet relief, almost a smile. Hold the shot. Natural window light, warm blacks, "
            "extremely shallow depth of field. Then the frame gently darkens toward black."
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
            if binary:
                return raw
            return json.loads(raw.decode())
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        raise RuntimeError(f"{method} {path} -> {e.code}: {err}") from e


def create(scene: dict) -> str:
    meta_path = RAW / f"{scene['id']}.json"
    if meta_path.exists():
        meta = json.loads(meta_path.read_text())
        if meta.get("id") and meta.get("status") != "failed":
            print(f"resume {scene['id']}: {meta['id']}", flush=True)
            return meta["id"]
    print(f"create {scene['id']}...", flush=True)
    res = req(
        "POST",
        "/videos",
        {
            "model": MODEL,
            "prompt": scene["prompt"],
            "seconds": SECONDS,
            "size": SIZE,
        },
    )
    meta_path.write_text(json.dumps({**res, "scene": scene["id"]}, indent=2))
    print(f"  -> {res['id']} status={res['status']}", flush=True)
    return res["id"]


def poll(video_id: str, scene_id: str, timeout_s: int = 1200) -> dict:
    meta_path = RAW / f"{scene_id}.json"
    start = time.time()
    while True:
        res = req("GET", f"/videos/{video_id}")
        meta_path.write_text(json.dumps({**res, "scene": scene_id}, indent=2))
        status = res.get("status")
        prog = res.get("progress", 0)
        print(f"  poll {scene_id}: {status} {prog}%", flush=True)
        if status == "completed":
            return res
        if status == "failed":
            raise RuntimeError(f"{scene_id} failed: {res}")
        if time.time() - start > timeout_s:
            raise TimeoutError(f"{scene_id} timed out")
        time.sleep(12)


def download(video_id: str, scene_id: str) -> Path:
    out = CLIPS / f"{scene_id}.mp4"
    if out.exists() and out.stat().st_size > 100_000:
        print(f"have {out}", flush=True)
        return out
    print(f"download {scene_id}...", flush=True)
    data = req("GET", f"/videos/{video_id}/content?variant=video", binary=True)
    out.write_bytes(data)
    print(f"  wrote {out} ({len(data)} bytes)", flush=True)
    # thumbnail for poster candidates
    try:
        thumb = req("GET", f"/videos/{video_id}/content?variant=thumbnail", binary=True)
        (CLIPS / f"{scene_id}.webp").write_bytes(thumb)
    except Exception as e:
        print(f"  thumb skip: {e}", flush=True)
    return out


def assemble(paths: list[Path]) -> Path:
    lst = ROOT / "concat.txt"
    lst.write_text("".join(f"file '{p}'\n" for p in paths))
    # Normalize each clip then concat
    norm_dir = ROOT / "norm"
    norm_dir.mkdir(exist_ok=True)
    norms = []
    for i, p in enumerate(paths):
        n = norm_dir / f"{i:02d}.mp4"
        if not n.exists():
            subprocess.check_call(
                [
                    "ffmpeg", "-y", "-i", str(p),
                    "-vf", "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=24",
                    "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
                    "-pix_fmt", "yuv420p", str(n),
                ],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        norms.append(n)
    lst.write_text("".join(f"file '{p}'\n" for p in norms))
    rough = ROOT / "rough.mp4"
    subprocess.check_call(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(rough)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    # Title card end + color grade + compress
    title = ROOT / "title.mp4"
    # Generate title card with drawtext
    subprocess.check_call(
        [
            "ffmpeg", "-y", "-f", "lavfi", "-i", "color=c=0x050505:s=1280x720:d=4",
            "-vf",
            (
                "drawtext=text='Find Your Voice.':fontcolor=0xF7E3B0:fontsize=48:"
                "x=(w-text_w)/2:y=(h-text_h)/2-30:font=Sans,"
                "drawtext=text='TalkForge':fontcolor=0xE8C173:fontsize=36:"
                "x=(w-text_w)/2:y=(h-text_h)/2+40:font=Sans"
            ),
            "-c:v", "libx264", "-pix_fmt", "yuv420p", str(title),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    graded = ROOT / "graded.mp4"
    # Warm grade + slight contrast; fade out into title via concat
    lst2 = ROOT / "concat2.txt"
    lst2.write_text(f"file '{rough}'\nfile '{title}'\n")
    joined = ROOT / "joined.mp4"
    subprocess.check_call(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst2), "-c", "copy", str(joined)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    final = OUT / "hero.mp4"
    subprocess.check_call(
        [
            "ffmpeg", "-y", "-i", str(joined),
            "-vf",
            (
                "eq=contrast=1.05:brightness=-0.02:saturation=0.95,"
                "colorbalance=rs=0.04:gs=0.02:bs=-0.03:rm=0.03:gm=0.01:bm=-0.02,"
                "fade=t=out:st=48:d=2"
            ),
            "-an",
            "-c:v", "libx264", "-preset", "slow", "-crf", "23",
            "-movflags", "+faststart", "-pix_fmt", "yuv420p",
            str(final),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    # Poster from last hope scene if present else first frame of final
    poster = OUT / "hero-poster.jpg"
    hope = CLIPS / "07_hope.mp4"
    src = hope if hope.exists() else final
    subprocess.check_call(
        ["ffmpeg", "-y", "-ss", "1", "-i", str(src), "-frames:v", "1", "-q:v", "3", str(poster)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    print(f"FINAL {final} size={final.stat().st_size}", flush=True)
    return final


def main():
    ids = {}
    # Create all jobs first (parallel queue on OpenAI side)
    for scene in SCENES:
        ids[scene["id"]] = create(scene)
        time.sleep(1.5)

    paths = []
    for scene in SCENES:
        vid = ids[scene["id"]]
        poll(vid, scene["id"])
        paths.append(download(vid, scene["id"]))

    assemble(paths)


if __name__ == "__main__":
    main()
