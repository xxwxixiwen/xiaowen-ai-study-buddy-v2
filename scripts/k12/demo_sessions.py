"""Create demo conversations with 小文 for screenshots; prints session ids.

Usage: .venv/bin/python scripts/k12/demo_sessions.py
"""

from __future__ import annotations

import asyncio

from deeptutor.app import DeepTutorApp

DEMOS = {
    "socratic": (["xiaowen-math"], ["0.2×0.3 我算出来是 0.6，对吗？", "两个因数一共两位小数，可是 6 只有一位数呀"]),
    "video": (["xiaowen-video", "xiaowen-math"], ["微课视频里，0.2×0.3 位数不够补 0 是在哪一段讲的？"]),
}


async def main() -> None:
    app = DeepTutorApp()
    for name, (kbs, messages) in DEMOS.items():
        session_id = None
        for content in messages:
            request = {
                "content": content,
                "capability": "chat",
                "persona": "xiaowen",
                "knowledge_bases": kbs,
                "language": "zh",
            }
            if session_id:
                request["session_id"] = session_id
            session, turn = await app.start_turn(request)
            session_id = session["id"]
            async for _ in app.stream_turn(turn["id"]):
                pass
        print(f"{name}={session_id}")


if __name__ == "__main__":
    asyncio.run(main())
