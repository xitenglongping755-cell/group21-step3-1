// app/page.tsx — Giftia 検索画面（2週目・穴埋め版）
// 【穴7】【穴8】を、対応表と公式ドキュメントを頼りに自分で埋める。
// 答えは 配布コード/答え合わせ/frontend/page.tsx（自分で埋めてから見る）。
// 1週目との違い：①searchGifts が FastAPI を呼ぶ（async/await）②入力した条件を渡す ③つながらないときの表示
// 【FR-01】3つ目のタブ「家族への誕生日」を足す。mode に "family" を追加。
//   ・使う場面／実用の質問（各最大2つ、「分からない」あり＝選ばない）と価格帯、関係（任意）を選ぶ
//   ・選択肢は /api/usage-tags から受け取る
//   ・/api/family-search を呼び、結果は今の ResultCard で並べる（上位3件は大きく：FR-06）
//   ・開いているタブの条件だけを送る（NFR-03：既存の2つのタブは今のまま）
"use client"; // ← ブラウザで動く合図。useState や onClick を使う画面に必要

import { useEffect, useState } from "react";
import ResultCard from "./ResultCard";
import { searchGifts, familySearch, fetchUsageTags, type Gift, type UsageTag } from "@/lib/api";

export default function Home() {
  // ① 状態（変化するデータ）を覚える箱
  const [mode, setMode] = useState<"standard" | "business" | "family">("standard"); // どのタブか
  const [keyword, setKeyword] = useState("");                             // 入力した言葉
  const [category, setCategory] = useState("");                           // 選んだカテゴリー
  const [indivWrap, setIndivWrap] = useState(false); // 個包装だけ（取引先へのお礼）
  const [priceBand, setPriceBand] = useState("");                         // 価格帯（取引先へのお礼）
  const [results, setResults] = useState<Gift[] | null>(null);            // 検索結果
  const [error, setError] = useState("");                                 // つながらないときの文言
  const [loading, setLoading] = useState(false);                          // 検索中かどうか（スピナーを出し、タブとボタンを押せなくする）
  // 【FR-01】家族への誕生日タブの状態
  const [usageTags, setUsageTags] = useState<UsageTag[]>([]); // 質問の選択肢（APIから受け取る）
  const [sceneTagIds, setSceneTagIds] = useState<number[]>([]);     // 使う場面（最大2つ・空=分からない）
  const [practicalTagIds, setPracticalTagIds] = useState<number[]>([]); // 実用（最大2つ・空=分からない）
  const [familyPriceBand, setFamilyPriceBand] = useState("");       // 価格帯（取引先へのお礼と同じ選び方）
  const [relation, setRelation] = useState("");                     // 関係（任意）

  // 【FR-01】タブの質問の選択肢を /api/usage-tags から受け取る（最初の1回だけ）
  useEffect(() => {
    fetchUsageTags()
      .then(setUsageTags)
      .catch(() => setError("質問の選択肢を取得できませんでした（/api/usage-tags につながりません）"));
  }, []);

  // 【FR-01】チェックボックスの切り替え（各質問とも最大2つまで。「分からない」＝何も選ばない）
  function toggleTag(list: number[], setList: (v: number[]) => void, id: number) {
    if (list.includes(id)) {
      setList(list.filter((x) => x !== id)); // 選び直し＝外す
    } else if (list.length < 2) {
      setList([...list, id]); // 2つ目まで
    }
  }

  // ② 検索ボタンの処理（API に聞くので、結果が返るまで待つ＝async/await）
  async function onSearch(e: React.FormEvent) {
    e.preventDefault(); // ページの再読み込みを止める
    if (loading) return; // 検索中にもう一度押されても、2回目は送らない
    setError("");
    setLoading(true); // 検索中にする（ボタンにスピナー、タブは押せなくなる）
    // いま開いているタブの条件だけを送る（もう一方のタブの入力は送らない）
    try {
      if (mode === "family") {
        // 【FR-01】家族への誕生日：/api/family-search に送る
        const condition = {
          sceneTagIds,
          practicalTagIds,
          ...(familyPriceBand === "3000" ? { priceMin: 3000, priceMax: 4999 } : {}), // 3,000以上 5,000未満
          ...(familyPriceBand === "5000" ? { priceMin: 5000, priceMax: 9999 } : {}), // 5,000以上 10,000未満
          ...(relation ? { relation } : {}),
        };
        setResults(await familySearch(condition));
      } else {
        const condition = mode === "standard"
          ? { keyword, category, indivWrap: false, priceBand: "" }
          : { keyword: "", category: "", indivWrap, priceBand };
        setResults(await searchGifts(condition)); // API に聞く（結果が返るまで待つ）
      }
    } catch (err) {
      setResults(null);
      setError(`APIにつながりません：${(err as Error).message}`); // 原因はブラウザの Console に出る
    } finally {
      setLoading(false); // うまくいっても、エラーでも、最後に検索中を終える
    }
  }

  // 【FR-01】タブの質問のブロック（使う場面・実用で使い回す）
  function TagQuestion({ title, tagType, list, setList }: {
    title: string; tagType: "scene" | "practical"; list: number[]; setList: (v: number[]) => void;
  }) {
    const tags = usageTags.filter((t) => t.tag_type === tagType);
    return (
      <fieldset className="tag-question">
        <legend>{title}<span className="hint">（最大2つまで・選ばなければ「分からない」になります）</span></legend>
        {tags.map((t) => (
          <label className="chk" key={t.tag_id}>
            <input
              type="checkbox"
              checked={list.includes(t.tag_id)}
              onChange={() => toggleTag(list, setList, t.tag_id)}
            />
            {t.tag_name}
          </label>
        ))}
        {tags.length === 0 && <span className="hint">選択肢を読み込み中です</span>}
      </fieldset>
    );
  }

  // ③ 画面
  return (
    <main className="page">
      <header className="header"><h1>Giftia</h1></header>

      {/* タブ：state(mode)＋条件で出し分ける */}
      <nav className="modes">
        <button disabled={loading} className={mode === "standard" ? "on" : ""} onClick={() => { setMode("standard"); setResults(null); }}>いまの検索</button>
        <button disabled={loading} className={mode === "business" ? "on" : ""} onClick={() => { setMode("business"); setResults(null); }}>取引先へのお礼</button>
        {/* 【FR-01】3つ目のタブ */}
        <button disabled={loading} className={mode === "family" ? "on" : ""} onClick={() => { setMode("family"); setResults(null); }}>家族への誕生日</button>
      </nav>

      <form className="form" onSubmit={onSearch}>
        {mode === "standard" ? (
          <>
            <input className="q" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="キーワード（例：送別 お菓子）" />
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">すべてのカテゴリー</option>
              <option value="コスメ">コスメ</option>
              <option value="食品">食品</option>
              <option value="生活雑貨">生活雑貨</option>
            </select>
          </>
        ) : mode === "business" ? (
          <>
            <label className="chk"><input type="checkbox" checked={indivWrap} onChange={(e) => setIndivWrap(e.target.checked)} /> 個包装</label>
            <select value={priceBand} onChange={(e) => setPriceBand(e.target.value)}>
              <option value="">すべての価格帯</option>
              <option value="3000">3,000〜5,000円</option>
              <option value="5000">5,000〜10,000円</option>
            </select>
          </>
        ) : (
          /* 【FR-01】家族への誕生日タブの入力欄 */
          <>
            <TagQuestion title="使う場面" tagType="scene" list={sceneTagIds} setList={setSceneTagIds} />
            <TagQuestion title="実用" tagType="practical" list={practicalTagIds} setList={setPracticalTagIds} />
            <select value={familyPriceBand} onChange={(e) => setFamilyPriceBand(e.target.value)}>
              <option value="">すべての価格帯</option>
              <option value="3000">3,000〜5,000円</option>
              <option value="5000">5,000〜10,000円</option>
            </select>
            {/* 【FR-01】関係は任意。画面の言葉にだけ使い、候補や順位には使わない */}
            <select value={relation} onChange={(e) => setRelation(e.target.value)}>
              <option value="">関係（任意）</option>
              <option value="母">母</option>
              <option value="父">父</option>
              <option value="祖母">祖母</option>
              <option value="祖父">祖父</option>
              <option value="義母">義母</option>
              <option value="義父">義父</option>
              <option value="配偶者">配偶者</option>
            </select>
          </>
        )}
        <button type="submit" disabled={loading} aria-busy={loading}>
          {loading ? (
            <>
              <span className="spinner" aria-hidden="true" />
              検索中…
            </>
          ) : (
            "検索"
          )}
        </button>
      </form>

      {error && <p className="summary">{error}</p>}

      {/* 結果：同じ ResultCard を map で並べる（使い回し） */}
      {results && (
        <section>
          <p className="summary">上位 {results.length} 件</p>
          {mode === "family" ? (
            /* 【FR-06】家族への誕生日タブ：上位3件を大きく＋合う理由と使用談つき、
               4件目以降は detail つきの今のカードで並べる */
            <>
              <div className="grid featured">
                {results.slice(0, 3).map((g, i) => (
                  <ResultCard key={g.id} gift={g} rank={i + 1} featured detail />
                ))}
              </div>
              {results.length > 3 && (
                <div className="grid">
                  {results.slice(3).map((g, i) => (
                    <ResultCard key={g.id} gift={g} rank={i + 4} detail />
                  ))}
                </div>
              )}
            </>
          ) : (
            /* 既存の2つのタブ：今のカードのまま（NFR-03） */
            <div className="grid">
              {results.map((g, i) => <ResultCard key={g.id} gift={g} rank={i + 1} />)}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
