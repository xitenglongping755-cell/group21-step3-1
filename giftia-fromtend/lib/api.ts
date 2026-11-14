// lib/api.ts — 2週目：searchGifts() の中身を「FastAPI に聞く」に差し替える（穴埋め版）
// 【穴5】【穴6】を、対応表と公式ドキュメントを頼りに自分で埋める。
// 1週目の lib/sampleGifts.ts は、このファイルに置き換える（ダミーは使わない）。
// 答えは 配布コード/答え合わせ/frontend/api.ts（自分で埋めてから見る）。

// 画面が使う商品の形。1週目と同じ（画面・ResultCard は変えない）
// 【FR-05】家族への誕生日タブでは reasons（合う理由）と voice（贈った人の声）を足す。
//   /api/search では返ってこないので、任意（?）にして既存のタブを壊さない（NFR-03）
export type Gift = {
  id: string;          // 商品ID（例 G0001）※ products.product_id のとおり文字列
  category: string;    // カテゴリ
  brand: string;       // ブランド・店名
  name: string;        // 商品名
  price: number;       // 価格（円）
  rating: number;      // レビューの平均
  reviewCount: number; // レビュー件数
  reasons?: string[];  // 【FR-05】合う理由＝一致したタグ名の配列
  voice?: Voice | null; // 【FR-05】贈った人の声。なければ null
};

// 【FR-05】使用談。抜粋・家族への誕生日に贈った人の声か・投稿日
// ※ JSON の項目名はバックエンドの to_gift と合わせること（4.3 API一覧）
export type Voice = {
  excerpt: string;           // 使用談の抜粋（確認済み ok のみ・NFR-05：個人情報は出さない）
  isFamilyBirthday: boolean; // 家族への誕生日に贈った方の声かどうか
  postedDate: string;        // 投稿日
};

// 【FR-01】/api/usage-tags が返すタグ（画面の質問の選択肢）。4.3 の契約どおり snake_case
export type UsageTag = {
  tag_id: number;
  tag_type: "scene" | "practical"; // scene＝使う場面／practical＝実用
  tag_name: string;
  display_order: number;
};

// 画面から渡す検索条件（2つのタブの分をまとめて持つ）
export type SearchCondition = {
  keyword: string;    // いまの検索：キーワード
  category: string;   // いまの検索：カテゴリー（空ならすべて）
  indivWrap: boolean; // 取引先へのお礼：個包装だけ
  priceBand: string;  // 取引先へのお礼："" | "3000" | "5000"
};

// 【FR-01】家族への誕生日タブの検索条件。「分からない」は配列を空のまま送る
export type FamilySearchCondition = {
  sceneTagIds: number[];     // 使う場面の tag_id（最大2つ・空なら「分からない」）
  practicalTagIds: number[]; // 実用の tag_id（最大2つ・空なら「分からない」）
  priceMin?: number;         // 価格帯（任意）
  priceMax?: number;
  relation?: string;         // 関係（任意）。画面の言葉（「お母さまに合う理由」など）にだけ使う
  limit?: number;            // 初期値10（1〜20）
};

// API の場所。NEXT_PUBLIC_ の値はブラウザに配られる＝秘密は置かない（.env.local に書く）
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// 入力した条件をサーバー（FastAPI）に送り、結果（Gift の配列）をもらう
export async function searchGifts(c: SearchCondition): Promise<Gift[]> {
  // ① 条件を URL のクエリ（?q=...&category=...）に組み立てる。空の条件は送らない
  const params = new URLSearchParams();
  if (c.keyword) params.set("q", c.keyword);
  if (c.category) params.set("category", c.category);
  if (c.indivWrap) params.set("indiv_wrap", "true");
  if (c.priceBand === "3000") { params.set("price_min", "3000"); params.set("price_max", "4999"); } // 3,000以上 5,000未満
  if (c.priceBand === "5000") { params.set("price_min", "5000"); params.set("price_max", "9999"); } // 5,000以上 10,000未満

  // ② fetch で API を呼ぶ（通信が終わるまで待つ＝await）
  const res = await fetch(`${API}/api/search?${params.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  // ③ 返ってきた JSON を読む。{ total, results } の results が Gift の配列
  const data = await res.json();
  return data.results;
}

// 【FR-01】画面の質問の選択肢（使う場面・実用のタグ）を /api/usage-tags から受け取る
export async function fetchUsageTags(): Promise<UsageTag[]> {
  const res = await fetch(`${API}/api/usage-tags`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// 【FR-01】家族への誕生日タブ：開いているタブの条件だけを /api/family-search に送る
// 配列は ?scene_tags=2&scene_tags=5 の形で受け渡す（4.3 の契約）
export async function familySearch(c: FamilySearchCondition): Promise<Gift[]> {
  const params = new URLSearchParams();
  c.sceneTagIds.forEach((id) => params.append("scene_tags", String(id)));
  c.practicalTagIds.forEach((id) => params.append("practical_tags", String(id)));
  if (c.priceMin !== undefined) params.set("price_min", String(c.priceMin));
  if (c.priceMax !== undefined) params.set("price_max", String(c.priceMax));
  if (c.relation) params.set("relation", c.relation); // 関係は任意。候補や順位には使わない（FR-01）
  if (c.limit !== undefined) params.set("limit", String(c.limit));

  const res = await fetch(`${API}/api/family-search?${params.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  return data.results;
}
