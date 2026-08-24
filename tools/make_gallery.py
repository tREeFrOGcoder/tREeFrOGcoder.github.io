#!/usr/bin/env python3
"""
Gallery 资产流水线（原型）。上线版会放在 tools/make_gallery.py。

用法:  python3 make_manifest.py [SRC_DIR] [OUT_DIR]

对 SRC_DIR 里每张原图:
  1. 读尺寸 + EXIF（拍摄时间 / 相机 / 镜头 / 光圈快门ISO / 焦距）
  2. 生成多档 WebP:  400w / 800w / 1600w / 2400w  → OUT_DIR/derived/
  3. 生成 LQIP —— 24px 宽的 base64 缩略图，直接内联进 manifest 做模糊占位
  4. 输出 photos.json（含 w/h/ar，前端无需等图片加载就能算布局）

以后你加照片:  丢进 photos/ → 跑一次这个脚本 → 完事。
标题/说明写在同名 .txt 或 photos.meta.json 里，脚本会保留你已有的。
"""
import base64, io, json, os, sys
from PIL import Image, ExifTags

SRC = sys.argv[1] if len(sys.argv) > 1 else "photos"
OUT = sys.argv[2] if len(sys.argv) > 2 else "derived"
WIDTHS = [400, 800, 1600, 2400]
QUALITY = {400: 74, 800: 76, 1600: 80, 2400: 82}

TAGS = {v: k for k, v in ExifTags.TAGS.items()}


def exif_of(im):
    """返回一个精简的拍摄参数字典。没有 EXIF 就返回空。"""
    out = {}
    try:
        ex = im.getexif()
        if not ex:
            return out
        ifd = ex.get_ifd(0x8769) or {}          # ExifIFD
        allx = {**dict(ex), **dict(ifd)}
        g = lambda name: allx.get(TAGS.get(name))

        dt = g("DateTimeOriginal") or g("DateTime")
        if dt:
            out["shot"] = str(dt).replace(":", "-", 2).split(" ")[0]

        make, model = g("Make"), g("Model")
        if model:
            out["camera"] = f"{make} {model}".replace("  ", " ").strip() if make and str(make) not in str(model) else str(model).strip()
        if g("LensModel"):
            out["lens"] = str(g("LensModel")).strip()

        fnum, exp, iso, flen = g("FNumber"), g("ExposureTime"), g("ISOSpeedRatings"), g("FocalLength")
        bits = []
        if flen:  bits.append(f"{float(flen):g}mm")
        if fnum:  bits.append(f"f/{float(fnum):g}")
        if exp:
            e = float(exp)
            bits.append(f"1/{round(1/e)}s" if e and e < 1 else f"{e:g}s")
        if iso:   bits.append(f"ISO {int(iso)}")
        if bits:  out["settings"] = " · ".join(bits)
    except Exception:
        pass
    return out


def lqip(im, w=24):
    """24px 宽的内联占位图 —— 通常 <900 字节，做模糊上浮效果。"""
    t = im.copy()
    t.thumbnail((w, w * 4), Image.LANCZOS)
    if t.mode not in ("RGB", "L"):
        t = t.convert("RGB")
    buf = io.BytesIO()
    t.save(buf, "WEBP", quality=42, method=4)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()


def main():
    os.makedirs(OUT, exist_ok=True)
    # 保留你手写的标题/说明
    meta_path = os.path.join(os.path.dirname(SRC) or ".", "photos.meta.json")
    meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {}

    files = sorted(f for f in os.listdir(SRC)
                   if f.lower().endswith((".webp", ".jpg", ".jpeg", ".png", ".tif", ".tiff")))
    out = []
    for f in files:
        p = os.path.join(SRC, f)
        stem = os.path.splitext(f)[0]
        im = Image.open(p)
        w, h = im.size
        rec = {
            "id": stem,
            "w": w, "h": h,
            "ar": round(w / h, 5),
            "lqip": lqip(im),
            "src": {},
        }
        rec.update(exif_of(im))
        rec.update(meta.get(stem, {}))          # 手写字段覆盖自动字段

        rgb = im.convert("RGB")
        for tw in WIDTHS:
            if tw > w * 1.05:                    # 不放大
                continue
            th = round(h * tw / w)
            dst = os.path.join(OUT, f"{stem}-{tw}.webp")
            if not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(p):
                rgb.resize((tw, th), Image.LANCZOS).save(dst, "WEBP", quality=QUALITY[tw], method=5)
            rec["src"][str(tw)] = f"{OUT}/{stem}-{tw}.webp"
        out.append(rec)
        print(f"  {stem:22s} {w}x{h}  →  {len(rec['src'])} 档   {rec.get('shot','(无EXIF日期)')}")

    dest = os.path.join(os.path.dirname(SRC) or ".", "photos.json")
    json.dump(out, open(dest, "w"), indent=1, ensure_ascii=False)
    tot = sum(os.path.getsize(os.path.join(OUT, x)) for x in os.listdir(OUT))
    orig = sum(os.path.getsize(os.path.join(SRC, x)) for x in files)
    print(f"\n{len(out)} 张 → {dest}")
    print(f"原图合计 {orig/1048576:.1f} MB   生成的多档合计 {tot/1048576:.1f} MB")


if __name__ == "__main__":
    main()
