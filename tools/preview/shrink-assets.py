"""
把 images/clean/ 下的 PNG 缩到 512x512，体积从 33MB 降到约 8MB。

为什么缩：微信小游戏限制是首包 4MB、代码包合计 30MB，而 resources 现在 33MB。
为什么 512 够用：按 game.js 的 fitCardSize() 实算，最宽的 4x4 关卡卡片只显示
65x74 逻辑像素，最紧的 6x6 只有 40x45；即使 @DPR=3 的旗舰机也只需 195x222 实际像素。
512 留了 2 倍余量，视觉上不会有任何差别。

原图已备份到 legacy/images-original/，本脚本不碰备份目录。
"""

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]   # tools/preview/ → 仓库根
SRC = ROOT / "images" / "clean"
TARGET = 512
# settlement 里有两张非正方图（1408x704），按长边缩放即可
KEEP_ALPHA = True

def human(n: int) -> str:
    for unit in ("B", "KB", "MB"):
        if n < 1024:
            return f"{n:.1f}{unit}"
        n /= 1024
    return f"{n:.1f}TB"

def main() -> int:
    if not SRC.is_dir():
        print(f"找不到 {SRC}", file=sys.stderr)
        return 1

    files = sorted(SRC.rglob("*.png"))
    if not files:
        print("没有 PNG 可处理", file=sys.stderr)
        return 1

    before_total = sum(f.stat().st_size for f in files)
    print(f"目标：把 {len(files)} 张 PNG 的长边缩到 {TARGET}px")
    print(f"缩前合计 {human(before_total)}\n")

    for f in files:
        before = f.stat().st_size
        with Image.open(f) as im:
            w, h = im.size
            mode = im.mode
            if max(w, h) <= TARGET:
                print(f"  跳过 {f.relative_to(ROOT)}  已是 {w}x{h}")
                continue

            # 按长边等比缩放，保持宽高比
            if w >= h:
                nw, nh = TARGET, max(1, round(h * TARGET / w))
            else:
                nh, nw = TARGET, max(1, round(w * TARGET / h))

            resized = im.resize((nw, nh), Image.LANCZOS)
            if KEEP_ALPHA and mode in ("RGBA", "LA", "P"):
                resized = resized.convert("RGBA")
            elif mode == "P":
                resized = resized.convert("RGBA")

            resized.save(f, format="PNG", optimize=True)

        after = f.stat().st_size
        pct = (1 - after / before) * 100 if before else 0
        print(
            f"  {f.relative_to(ROOT)}  {w}x{h} → {nw}x{nh}  "
            f"{human(before)} → {human(after)}  (-{pct:.0f}%)"
        )

    after_total = sum(f.stat().st_size for f in files)
    print(f"\n缩后合计 {human(after_total)}  （省下 {human(before_total - after_total)}）")
    print(f"运行时资源包体积：{human(after_total)} / 上限 30MB  "
          f"{'✓ 通过' if after_total < 30 * 1024 * 1024 else '✗ 仍超'}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
