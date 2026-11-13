-- DR-01 タグ用のテーブル（要件定義書 5.2）Issue #11
-- 実行先：giftia_t504（2026-11-14 に実行済み）
-- product_id の型と COLLATE は、既存の products・product_facts に合わせる
-- 作る順番：usage_tags → product_usage_tags（外部キーで参照するため）
-- 作り直すとき：DROP TABLE giftia_t504.product_usage_tags; → DROP TABLE giftia_t504.usage_tags; の順

-- タグの種類の一覧
CREATE TABLE giftia_t504.usage_tags (
  tag_id        INT         NOT NULL,
  tag_type      VARCHAR(20) NOT NULL,  -- scene＝使う場面、practical＝実用
  tag_name      VARCHAR(30) NOT NULL,  -- 画面の選択肢と「合う理由」に出す言葉
  display_order INT         NOT NULL,  -- 画面に並べる順番
  PRIMARY KEY (tag_id),
  UNIQUE KEY uq_usage_tags_name (tag_type, tag_name),
  CHECK (tag_type IN ('scene', 'practical'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_ja_0900_as_cs;

-- どの商品に、どのタグを付けたか
CREATE TABLE giftia_t504.product_usage_tags (
  product_id   VARCHAR(10) NOT NULL,                      -- products.product_id と同じ型
  tag_id       INT         NOT NULL,
  source       VARCHAR(10) NOT NULL DEFAULT 'manual',     -- ai＝生成AIの候補／manual＝人が付けた
  check_status VARCHAR(10) NOT NULL DEFAULT 'unchecked',  -- unchecked／ok／ng（ng は検索に使わない）
  PRIMARY KEY (product_id, tag_id),
  KEY idx_put_tag (tag_id),
  CONSTRAINT fk_put_product FOREIGN KEY (product_id) REFERENCES giftia_t504.products (product_id),
  CONSTRAINT fk_put_tag     FOREIGN KEY (tag_id)     REFERENCES giftia_t504.usage_tags (tag_id),
  CHECK (source IN ('ai', 'manual')),
  CHECK (check_status IN ('unchecked', 'ok', 'ng'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_ja_0900_as_cs;
