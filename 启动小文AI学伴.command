#!/bin/zsh
set -eu
STUDY_ROOT="$(cd "$(dirname "$0")" && pwd)"
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
export DEEPTUTOR_HOME="$STUDY_ROOT"
export XIAOWEN_MEDIA_ROOT="${XIAOWEN_MEDIA_ROOT:-$STUDY_ROOT/media}"
export PYTHONDONTWRITEBYTECODE=1
STUDY_PYTHON="$STUDY_ROOT/.venv/bin/python"
if [[ ! -x "$STUDY_PYTHON" || ! -f "$STUDY_ROOT/web/node_modules/next/dist/bin/next" ]] || ! command -v node >/dev/null; then
  echo "请先按README安装Python和Node依赖。"
  read -r "STUDY_CLOSE?按回车关闭…"
  exit 1
fi
STUDY_BACKEND_PID=""
STUDY_FRONTEND_PID=""
function study_cleanup() {
  if [[ -n "$STUDY_BACKEND_PID" ]]; then kill "$STUDY_BACKEND_PID" 2>/dev/null || true; fi
  if [[ -n "$STUDY_FRONTEND_PID" ]]; then kill "$STUDY_FRONTEND_PID" 2>/dev/null || true; fi
}
trap study_cleanup EXIT INT TERM
mkdir -p "$STUDY_ROOT/data/user/logs"
cd "$STUDY_ROOT"
if ! curl --noproxy '*' -fsS http://127.0.0.1:8001/api/k12/catalog -o /dev/null; then
  "$STUDY_PYTHON" -m uvicorn deeptutor.api.main:app --host 127.0.0.1 --port 8001 > data/user/logs/student-backend.log 2>&1 &
  STUDY_BACKEND_PID=$!
fi
if ! curl --noproxy '*' -fsS http://127.0.0.1:3782/study -o /dev/null; then
  cd "$STUDY_ROOT/web"
  BACKEND_PORT=8001 npm run dev -- --hostname 127.0.0.1 --port 3782 > ../data/user/logs/student-frontend.log 2>&1 &
  STUDY_FRONTEND_PID=$!
fi
echo "正在准备小文AI学伴 v2…"
STUDY_READY=false
for STUDY_CHECK in {1..60}; do
  if curl --noproxy '*' -fsS http://127.0.0.1:8001/api/k12/catalog -o /dev/null && curl --noproxy '*' -fsS http://127.0.0.1:3782/study -o /dev/null; then
    STUDY_READY=true
    break
  fi
  sleep 1
done
if [[ "$STUDY_READY" == true ]]; then
  open http://127.0.0.1:3782/study
  echo "小文AI学伴 v2已打开。保留此窗口即可使用。"
else
  echo "启动未完成，请查看data/user/logs中的日志。"
fi
read -r "STUDY_CLOSE?按回车关闭本次启动的服务…"
