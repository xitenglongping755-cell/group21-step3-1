# main.py — Giftia 検索API（2週目・穴埋め版）
# 【穴1】〜【穴4】を、対応表と公式ドキュメント・データ定義.md を頼りに自分で埋める。
# 埋めるまでは ___ が残っていて動かない（/api/search を呼ぶと 500 になり、ターミナルに NameError と行番号が出る）。
# 答えは 配布コード/答え合わせ/backend/main.py（自分で埋めてから見る）。
#
# 画面（Next.js）から呼ばれる「窓口」。条件を受け取り、班のDBを検索して、結果を JSON で返す。
# 起動：uvicorn main:app --reload
# 確認：http://localhost:8000/docs（Swagger UI。ブラウザから API を試せる）

import os

from dotenv import load_dotenv
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from database import fetch_all

load_dotenv()  # .env を読む（DB の接続情報・CORS の許可）

app = FastAPI(title="Giftia Search API（2週目）")

# ── CORS ───────────────────────────────────────
# 画面（http://localhost:3000）と API（http://localhost:8000）は別のアプリ＝オリジンが違う。
# ブラウザは既定で「別オリジンへの通信」を止めるので、API 側が「この画面からは受け付ける」と宣言する。
# 許可する画面の URL は .env の CORS_ORIGINS に書く（カンマ区切りで複数可）。空なら何も許可しない。
origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["GET"], allow_headers=["*"])


@app.get("/api/health")
def health():
    """つながっているかの確認。どの DB に何件の商品があるか"""
    row = fetch_all("SELECT DATABASE() AS db, COUNT(*) AS products FROM products")[0]
    return {"status": "ok", "db": row["db"], "products": row["products"]}

@app.get("/api/usage-tags")
def usage_tags():
    """画面の質問の選択肢（使う場面・実用のタグ）。使う場面 → 実用の順、それぞれ表示順で返す"""
    rows = fetch_all(
        """SELECT tag_id, tag_type, tag_name, display_order
           FROM usage_tags
           ORDER BY CASE tag_type WHEN 'scene' THEN 1 WHEN 'practical' THEN 2 ELSE 3 END, display_order"""
    )
    return {"tags": rows}


@app.get("/api/search")
def search(
    q: str = Query(default="", description="キーワード（空白区切りで複数。すべてを含む商品）"),
    category: str = Query(default="", description="カテゴリー（空ならすべて）"),
    indiv_wrap: bool = Query(default=False, description="true なら、説明文に「個包装」とある商品だけ"),
    price_min: int | None = Query(default=None, ge=0, description="価格の下限（以上）"),
    price_max: int | None = Query(default=None, ge=0, description="価格の上限（以下）"),
    limit: int = Query(default=20, ge=1, le=100, description="返す件数"),
):
    """条件に合う商品を、人気順（直近1年の販売数）で上位 limit 件返す"""
    # ① 条件を WHERE に1つずつ足す（値は %s で渡し、SQL の文字列に直接つなげない）
    where, params = ["stock > 0"], []  # 在庫切れは出さない
    for word in q.split():  # 【穴1】q を空白で区切って1語ずつにする（文字列のメソッド）
        where.append("(product_name LIKE %s OR brand LIKE %s OR description LIKE %s)")
        params += [f"%{word}%"] * 3
    if category:
        where.append("category = %s")
        params.append(category)  # 【穴2】%s に入れる値（受け取ったカテゴリー）
    if indiv_wrap:
        where.append("description LIKE %s")  # 「個包装」は列がないので、説明文に書いてあるかで見る
        params.append("%個包装%")  # 【穴3】「個包装」をどこかに含む、という LIKE のパターン
    if price_min is not None:
        where.append("price >= %s")
        params.append(price_min)
    if price_max is not None:
        where.append("price <= %s")
        params.append(price_max)
    condition = " AND ".join(where)

    # ② 件数と、人気順の上位 limit 件を取る
    total = fetch_all(f"SELECT COUNT(*) AS n FROM products WHERE {condition}", tuple(params))[0]["n"]
    rows = fetch_all(
        f"""SELECT product_id, category, brand, product_name, price, rating, review_count
            FROM products WHERE {condition}
            ORDER BY sales_count DESC, product_id
            LIMIT %s""",
        (*params, limit),
    )
    # ③ DB の行を、画面の Gift 型（1週目）に詰め替えて返す
    return {"total": total, "results": [to_gift(r) for r in rows]}

# 家族への誕生日タブで候補にするシーンタグ（FR-03。班で確定したらここだけ直す）
FAMILY_SCENES = ("誕生日", "母の日", "父の日")

@app.get("/api/family-search")
def family_search(
    scene_tags: list[int] = Query(default=[], max_length=2, description="使う場面のタグID（最大2つ。usage_tags の scene）"),
    practical_tags: list[int] = Query(default=[], max_length=2, description="実用のタグID（最大2つ。usage_tags の practical）"),
    price_min: int | None = Query(default=None, ge=0, description="価格の下限（以上）"),
    price_max: int | None = Query(default=None, ge=0, description="価格の上限（以下）"),
    relation: str = Query(default="", max_length=10, description="関係（任意。画面の言葉にだけ使い、検索には使わない）"),
    limit: int = Query(default=10, ge=1, le=50, description="返す件数"),
):
    """家族への誕生日タブの検索。在庫・予算・家族向けシーンタグで候補を取り（FR-03）、選んだタグとの一致数 → 人気順で並べる（FR-04）"""
    # ① 条件：在庫あり・予算内・家族向けのシーンタグがある商品だけ（FR-03）
    where, params = ["stock > 0"], []
    placeholders = ", ".join(["%s"] * len(FAMILY_SCENES))
    where.append(
        f"EXISTS (SELECT 1 FROM product_scenes s WHERE s.product_id = products.product_id AND s.scene_tag IN ({placeholders}))"
    )
    params += list(FAMILY_SCENES)
    if price_min is not None:
        where.append("price >= %s")
        params.append(price_min)
    if price_max is not None:
        where.append("price <= %s")
        params.append(price_max)
    condition = " AND ".join(where)

    # ② 件数と、選んだタグとの一致数 → 人気順 → product_id で上位 limit 件を取る（FR-04）
    total = fetch_all(f"SELECT COUNT(*) AS n FROM products WHERE {condition}", tuple(params))[0]["n"]
    tag_ids = scene_tags + practical_tags
    if tag_ids:
        tag_ph = ", ".join(["%s"] * len(tag_ids))
        match_sql = f"""(SELECT COUNT(*) FROM product_usage_tags t
                          WHERE t.product_id = products.product_id
                            AND COALESCE(t.check_status, '') <> 'ng'
                            AND t.tag_id IN ({tag_ph}))"""
    else:
        match_sql = "0"  # タグを選んでいない（「分からない」だけ）ときは、全商品0として人気順
    rows = fetch_all(
        f"""SELECT product_id, category, brand, product_name, price, rating, review_count,
                   {match_sql} AS match_count
            FROM products WHERE {condition}
            ORDER BY match_count DESC, sales_count DESC, product_id
            LIMIT %s""",
        (*tag_ids, *params, limit),
    )
        # ③ /api/search と同じ形で返す（画面は今の ResultCard をそのまま使える）
    return {"total": total, "results": [to_gift(r) for r in rows]}

def to_gift(r: dict) -> dict:
    """DB の列名 → 画面（lib/api.ts の Gift 型）の項目名。画面側は1週目のまま変えない"""
    return {
        "id": r["product_id"],
        "category": r["category"],
        "brand": r["brand"],
        "name": r["product_name"],  # 【穴4】商品名の列名（データ定義.md の products を見る）
        "price": r["price"],
        "rating": float(r["rating"]) if r["rating"] is not None else 0,  # レビューなしは 0
        "reviewCount": r["review_count"],
    }
