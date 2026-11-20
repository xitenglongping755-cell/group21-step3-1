// app/ResultCard.tsx — 結果カード（部品）。2週目の変更は import の1行だけ（Gift 型の置き場所が lib/api.ts に変わった）
// 【FR-06】detail=true のとき「合う理由」と使用談を出す（家族への誕生日タブからだけ渡す）。
// 【NFR-03】引数を渡さない既存の2つのタブでは、今までどおりの表示のまま（変えない）。
import type { Gift } from "@/lib/api";

type Props = {
  gift: Gift;
  rank: number;
  featured?: boolean; // 【FR-06】家族への誕生日タブの上位3件＝大きく表示
  detail?: boolean;   // 【FR-06】合う理由と使用談を出すか（家族への誕生日タブだけ true）
};

export default function ResultCard({ gift, rank, featured = false, detail = false }: Props) {
  return (
    <div className={featured ? "card featured" : "card"}>
      <p className="meta">{rank}位・{gift.category}・{gift.brand}</p>
      <h3 className="name">{gift.name}</h3>
      <p className="price">{gift.price.toLocaleString()}円</p>
      <p className="meta">評価{gift.rating}（{gift.reviewCount}件）</p>

      {detail && (
        <>
        {/* 【FR-05】合う理由=一致したタグ名を横に並べる。reasons が返ってきたときだけ出す */}
        {gift.reasons && gift.reasons.length > 0 && (
        <div className="reasons">
        <span className="reasons-label">合う理由</span>
        {gift.reasons.map((r) => (
        <span className="reason-tag" key={r}>{r}</span>
        ))}
        </div>
        )}
        {/* 【FR-06】使用談。ある商品には声を、ない商品には無い旨を出す */}
        {gift.voice ? (
        <blockquote className="voice">
        {gift.voice.isFamilyBirthday && (
        <span className="voice-label">家族に贈った方の声</span>
        )}
        「{gift.voice.excerpt}」
        <span className="voice-date">({gift.voice.postedDate})</span>
        </blockquote>
        ) : (
        <p className="voice-none">贈った人の声はまだありません</p>
        )}
        </>
      )}
    </div>
  );
}
