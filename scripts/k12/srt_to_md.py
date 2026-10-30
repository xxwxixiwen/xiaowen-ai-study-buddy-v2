"""Convert an SRT subtitle file into a timestamp-tagged Markdown transcript.

Each cue becomes one line prefixed with its time range, e.g.
``[02:36–02:43] 还有一种情况要小心……``, so a knowledge base built from the
output lets answers cite the exact moment in the video.

Usage: .venv/bin/python scripts/k12/srt_to_md.py <input.srt> <output.md> [--title 标题]
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

_TIME = re.compile(r"(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})")


def _clock(h: str, m: str, s: str) -> str:
    total = int(h) * 3600 + int(m) * 60 + int(s)
    hours, rest = divmod(total, 3600)
    minutes, secs = divmod(rest, 60)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}" if hours else f"{minutes:02d}:{secs:02d}"


def convert(srt_text: str) -> list[str]:
    lines: list[str] = []
    for block in re.split(r"\n\s*\n", srt_text.replace("\r\n", "\n").strip()):
        rows = [row.strip() for row in block.split("\n") if row.strip()]
        for index, row in enumerate(rows):
            match = _TIME.search(row)
            if not match:
                continue
            text = " ".join(rows[index + 1 :]).strip()
            if text:
                start = _clock(*match.group(1, 2, 3))
                end = _clock(*match.group(5, 6, 7))
                lines.append(f"[{start}–{end}] {text}")
            break
    return lines


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("srt", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--title", default="")
    args = parser.parse_args()

    cues = convert(args.srt.read_text(encoding="utf-8"))
    title = args.title or args.srt.stem
    header = [
        f"# 视频字幕（带时间点）· {title}",
        "",
        f"> 由 `{args.srt.name}` 自动生成。每行开头的方括号是视频时间点（分:秒），引用时请注明“视频 分:秒”。",
        "",
    ]
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text("\n".join(header + cues) + "\n", encoding="utf-8")
    print(f"{len(cues)} cues -> {args.output}")


if __name__ == "__main__":
    main()
