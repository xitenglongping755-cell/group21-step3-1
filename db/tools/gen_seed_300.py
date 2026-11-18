# gen_seed_300.py — 確認済みのCSVから、product_usage_tags に入れる INSERT 文を作る
# 使い方：python gen_seed_300.py reviewed.csv
# 入力CSVの列（1行＝1商品。タグIDは ; 区切り。空でもよい）
#   product_id, ai_scene, ai_practical, final_scene, final_practical
#   ai_*    = 生成AIが出した候補（そのまま残す）
#   final_* = 確認したあとの最終のタグ
# 出力：seed_tags_300.sql（product_id とタグIDだけ。商品名は入らない）
import csv
import sys

SCENE_IDS = set(range(1, 11))          # 使う場面のタグID 1〜10（usage_tags に合わせる）
PRACTICAL_IDS = set(range(101, 107))   # 実用のタグID


def ids(cell, allowed, where):
    out = set()
    for part in (cell or "").replace("、", ";").replace(",", ";").split(";"):
        part = part.strip()
        if not part:
            continue
        n = int(part)
        if n not in allowed:
            sys.exit(f"{where} に、一覧にないタグID {n} があります")
        out.add(n)
    return out


src = sys.argv[1] if len(sys.argv) > 1 else "reviewed.csv"
values, kept, ai_total, no_scene = [], 0, 0, []

with open(src, encoding="utf-8-sig", newline="") as f:
    for row in csv.DictReader(f):
        pid = row["product_id"].strip()
        where = f"product_id={pid}"
        ai = ids(row["ai_scene"], SCENE_IDS, where) | ids(row["ai_practical"], PRACTICAL_IDS, where)
        final_scene = ids(row["final_scene"], SCENE_IDS, where)
        final = final_scene | ids(row["final_practical"], PRACTICAL_IDS, where)
        if not final_scene:
            no_scene.append(pid)
        q = pid.replace("'", "''")
        for t in sorted(ai | final):
            if t in final and t in ai:
                values.append(f"('{q}', {t}, 'ai', 'ok')")       # AIの候補を確認してOK
                kept += 1
            elif t in final:
                values.append(f"('{q}', {t}, 'manual', 'ok')")   # 確認した人が足した
            else:
                values.append(f"('{q}', {t}, 'ai', 'ng')")       # AIの候補を確認して外した
        ai_total += len(ai)

if no_scene:
    sys.exit(f"使う場面タグが1つもない商品があります：{', '.join(no_scene)}")

with open("seed_tags_300.sql", "w", encoding="utf-8") as f:
    f.write("-- DR-01 300件のタグ（gen_seed_300.py で作成。ng は検索に使わない）\n")
    f.write("INSERT INTO giftia_t504.product_usage_tags (product_id, tag_id, source, check_status) VALUES\n")
    f.write(",\n".join(values) + ";\n")

rate = kept / ai_total * 100 if ai_total else 0
print(f"{len(values)} 行を seed_tags_300.sql に書きました")
print(f"AIの候補の正解率：{kept} / {ai_total} = {rate:.1f}%（要件定義書 5.4 の目標は90%以上）")
