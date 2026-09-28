interface Props {
  label: string;
  score: number | null;
}

function scoreClass(score: number | null): string {
  if (score === null) return "score-unknown";
  if (score >= 90) return "score-good";
  if (score >= 50) return "score-average";
  return "score-poor";
}

export function ScoreGauge({ label, score }: Props) {
  return (
    <div className={`score-card ${scoreClass(score)}`}>
      <div className="score-value">{score === null ? "–" : score}</div>
      <div className="score-label">{label}</div>
    </div>
  );
}
