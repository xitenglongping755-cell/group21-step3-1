-- DR-01 タグの種類と、仮のタグ10件（要件定義書 5.2）Issue #11
-- 実行先：giftia_t504（2026-11-14 に実行済み）
-- schema.sql を実行したあとに、1回だけ実行する（2回目は Duplicate entry のエラーになる）

-- ① タグの種類（16件）
-- 使う場面は 1〜、実用は 101〜。打ち合わせで一覧が変わったらここを直す
-- 10「部屋に花や小物を飾る」は、家族への誕生日の上位10件のうち6件が花だったため追加
INSERT INTO giftia_t504.usage_tags (tag_id, tag_type, tag_name, display_order) VALUES
(1,   'scene', '料理・食事の支度',           1),
(2,   'scene', 'お茶・コーヒーの時間',       2),
(3,   'scene', '掃除・洗濯などの家事',       3),
(4,   'scene', 'ガーデニング・家庭菜園',     4),
(5,   'scene', '散歩・お出かけ',             5),
(6,   'scene', 'お風呂・くつろぎ',           6),
(7,   'scene', '読書・手芸など趣味の時間',   7),
(8,   'scene', '身だしなみ・おしゃれ',       8),
(9,   'scene', '家族や孫との時間',           9),
(10,  'scene', '部屋に花や小物を飾る',       10),
(101, 'practical', '毎日使える',             1),
(102, 'practical', '手入れが簡単',           2),
(103, 'practical', '軽くて扱いやすい',       3),
(104, 'practical', '置き場所をとらない',     4),
(105, 'practical', '食べ物・飲み物（消えもの）', 5),
(106, 'practical', '体をいたわる',           6);

-- ② 仮のタグ10件（26行。チームが説明文を読んで手で付けたもの）
-- 対象の10件は、推定シーンが「家族への誕生日」かつ、お客さんの選んだ用途も「誕生日」の注文で、
-- よく買われている上位10件（在庫あり）。選んだSQLは下の③
INSERT INTO giftia_t504.product_usage_tags (product_id, tag_id, source, check_status) VALUES
('G4271', 10,  'manual', 'ok'),  -- 花とお菓子のセット（チョコレート）
('G4271', 2,   'manual', 'ok'),
('G4271', 105, 'manual', 'ok'),
('G6009', 10,  'manual', 'ok'),  -- 花とお菓子のセット（紅茶）
('G6009', 2,   'manual', 'ok'),
('G6009', 105, 'manual', 'ok'),
('G2892', 1,   'manual', 'ok'),  -- ボイルずわい蟹 3kg
('G2892', 9,   'manual', 'ok'),
('G2892', 105, 'manual', 'ok'),
('G2083', 9,   'manual', 'ok'),  -- 白桃のタルト（5号）
('G2083', 2,   'manual', 'ok'),
('G2083', 105, 'manual', 'ok'),
('G7282', 8,   'manual', 'ok'),  -- ボタニカルハンドクリーム 金木犀
('G7282', 101, 'manual', 'ok'),
('G7282', 104, 'manual', 'ok'),
('G0200', 10,  'manual', 'ok'),  -- フラワーボックス「パープル系」
('G0200', 102, 'manual', 'ok'),
('G1422', 10,  'manual', 'ok'),  -- 季節のフラワーボックス M
('G1422', 102, 'manual', 'ok'),
('G2239', 10,  'manual', 'ok'),  -- 季節のフラワーボックス L
('G2239', 102, 'manual', 'ok'),
('G3759', 2,   'manual', 'ok'),  -- 焼き菓子アソート 15個入
('G3759', 105, 'manual', 'ok'),
('G3692', 10,  'manual', 'ok'),  -- お花とお菓子のセット（紅茶）
('G3692', 2,   'manual', 'ok'),
('G3692', 105, 'manual', 'ok');

-- ③ 参考：仮の10件を選んだSQL（見るだけ。実行してもDBは変わらない）
-- SELECT p.product_id, p.product_name, p.category, p.description,
--        COUNT(*) AS family_orders,
--        f.value AS shelf_life_days
-- FROM giftia_t504.orders o
-- JOIN giftia_t504.order_items oi ON oi.order_id = o.order_id
-- JOIN giftia_t504.products p     ON p.product_id = oi.product_id
-- LEFT JOIN giftia_t504.product_facts f
--   ON f.product_id = p.product_id AND f.fact = 'shelf_life_days'
-- WHERE o.estimated_scene = '家族への誕生日'
--   AND o.gift_purpose    = '誕生日'
--   AND p.stock > 0
-- GROUP BY p.product_id, f.value
-- ORDER BY family_orders DESC, p.product_id
-- LIMIT 10;

-- ④ 確認用（見るだけ）。10 と出ればOK
-- SELECT COUNT(DISTINCT pt.product_id) AS n
-- FROM giftia_t504.product_usage_tags pt
-- JOIN giftia_t504.usage_tags t ON t.tag_id = pt.tag_id
-- WHERE t.tag_type = 'scene' AND pt.check_status <> 'ng';
