# export_top300.py — 家族への誕生日の注文で買われた回数の上位300件から、まだタグが付いていない商品をCSVに書き出す
# 選び方（チーム合意）：
#   推定シーンが「家族への誕生日」かつ 贈る目的が「誕生日」の注文で、買われた回数が多い順に300件（在庫ありのみ）
#   推定シーンは「タグを付ける順番」を決めるためだけに使い、検索の条件には使わない
#   仮の10件はこの上位に入っているので除く → 残り290件がCSVに出る（合わせて300件）
# 使い方：backend フォルダ（database.py と .env がある場所）で
#   python ../db/tools/export_top300.py
# 出力：products_top300.csv（商品名・説明文が入るので GitHub には上げない）
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path.cwd()))  # backend の database.py を使う
from database import fetch_all

SCENE = "家族への誕生日"   # orders.estimated_scene の値
PURPOSE = "誕生日"         # orders.gift_purpose の値
TOP_N = 300

rows = fetch_all(
    """SELECT t.product_id, p.product_name, p.category, p.brand, p.price, p.description,
              t.family_orders,
              f.value AS shelf_life_days  -- product_facts：値があれば食べ物（消えものの手がかり）
       FROM (
         SELECT oi.product_id, COUNT(oi.order_id) AS family_orders
         FROM giftia_t504.orders o
         JOIN giftia_t504.order_items oi ON oi.order_id = o.order_id
         JOIN giftia_t504.products p2 ON p2.product_id = oi.product_id
         WHERE o.estimated_scene = %s AND o.gift_purpose = %s AND p2.stock > 0
         GROUP BY oi.product_id
         ORDER BY family_orders DESC, oi.product_id
         LIMIT %s
       ) AS t
       JOIN giftia_t504.products p ON p.product_id = t.product_id
       LEFT JOIN giftia_t504.product_facts f
         ON f.product_id = t.product_id AND f.fact = 'shelf_life_days'
       WHERE NOT EXISTS (
         SELECT 1 FROM giftia_t504.product_usage_tags pt WHERE pt.product_id = t.product_id
       )
       ORDER BY t.family_orders DESC, t.product_id""",
    (SCENE, PURPOSE, TOP_N),
)

if not rows:
    sys.exit("0件でした。テーブルができているか、接続先が giftia_t504 かを確かめてください")

with open("products_top300.csv", "w", newline="", encoding="utf-8-sig") as f:
    writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
    writer.writeheader()
    writer.writerows(rows)

print(f"{len(rows)} 件を products_top300.csv に保存しました（タグ付け済みの商品は除いています）")
