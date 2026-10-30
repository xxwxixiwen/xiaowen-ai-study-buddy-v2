"""Acceptance dialogues for the 小文 persona + xiaowen-math knowledge base.

Usage: .venv/bin/python scripts/k12/xiaowen_acceptance.py [scenario ...]
Scenarios: decimal_point, pad_zero, quiz, video (default: all).
"""

from __future__ import annotations

import asyncio
import sys
from collections import Counter

from deeptutor.app import DeepTutorApp

PERSONA = "xiaowen"
KB = "xiaowen-math"
VIDEO_KB = "xiaowen-video"

SCENARIOS: dict[str, list[str]] = {
    "decimal_point": ["2.5×0.4 等于多少？"],
    "pad_zero": ["0.2×0.3 我算出来是 0.6，对吗？", "两个因数一共两位小数，可是 6 只有一位数呀", "那在 6 前面补一个 0，就是 0.06！"],
    "video": ["微课视频里，0.2×0.3 位数不够补 0 是在哪一段讲的？", "视频里还教了什么办法检查结果对不对？"],
    "quiz": ["小文，给我出一道小数乘法的题吧", "我算出来是 0.18", "哦，一共三位小数，24×12=288，所以是 0.288"],
}


async def run_turn(
    app: DeepTutorApp, content: str, session_id: str | None, kbs: list[str]
) -> tuple[str, str, Counter]:
    request = {
        "content": content,
        "capability": "chat",
        "persona": PERSONA,
        "knowledge_bases": kbs,
        "language": "zh",
    }
    if session_id:
        request["session_id"] = session_id
    session, turn = await app.start_turn(request)
    parts: list[str] = []
    kinds: Counter = Counter()
    async for event in app.stream_turn(turn["id"]):
        kind = str(event.get("type"))
        kinds[kind] += 1
        if kind == "tool_call":
            kinds[f"tool:{(event.get('metadata') or {}).get('tool') or event.get('content')}"] += 1
        if kind == "content":
            parts.append(str(event.get("content") or ""))
    return session["id"], "".join(parts).strip(), kinds


async def main(names: list[str]) -> None:
    app = DeepTutorApp()
    for name in names:
        print(f"\n==================== {name} ====================")
        session_id = None
        for content in SCENARIOS[name]:
            kbs = [VIDEO_KB, KB] if name == "video" else [KB]
            session_id, reply, kinds = await run_turn(app, content, session_id, kbs)
            tools = sorted(k for k in kinds if k.startswith("tool:"))
            print(f"\n【学生】{content}\n【小文】{reply}\n  (tools: {', '.join(tools) or '-'}; events: {dict(kinds)})")


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1:] or list(SCENARIOS)))
