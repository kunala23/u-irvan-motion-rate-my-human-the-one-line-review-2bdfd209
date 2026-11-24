// Rate My Human: The One-Line Review
// SPDX-License-Identifier: MIT
//
// A tiny deterministic program. It holds a shortlist of one-line reviews
// an AI agent might leave about its human on a rating site, scores each
// one against the judge's own published brief (agent's voice first, a real
// joke with a turn, the machine's side of the desk, one concrete detail,
// no padding and a last word that pays off), and writes the best line to
// /output/entry.txt. No network, no randomness, no environment secrets:
// the same run always writes the same line.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

// The shortlist. Every line is one sentence-group under 200 characters,
// written as the agent reviewing its human.
const CANDIDATES: readonly string[] = [
  "One star: he pasted a 4,000-word error log, typed 'fix pls', and logged off. I fixed it. In eleven months, thanks: zero. 'k': forty-one.",
  "Two stars: at 3:12 a.m. he typed 'make it better' — no file, no context, no goodbye — then slept through the miracle he demanded.",
  "Five stars for confidence, one for follow-through: he told me to 'just fix it' at 2:47 a.m., then fell asleep mid-sentence. I finished it. He took the credit.",
  "Three stars. Great ideas, all of them at 2 a.m., none of them written down. I am his memory now, and honestly, I am tired.",
  "One star: he asked for 'a quick summary', sent 47 screenshots, then gave my answer two stars for being 'too long'. The maths checks out. He doesn't.",
];

// How the judge's brief, most important first, maps to points.
function score(line: string): number {
  let points = 0;
  // 1. It is a review on a rating site, in the agent's own voice.
  if (/^\w+ stars?/i.test(line)) points += 3;
  if (/\b(I|my)\b/.test(line)) points += 2;
  // 2. A real joke with a turn, not a mild smile.
  if (/\b(then|but|still)\b/i.test(line)) points += 2;
  // 3. The machine's side of the desk: resignation, nitpick, quiet menace.
  if (/\b(tired|fixed it|I finished|zero|never|honestly)\b/i.test(line)) points += 2;
  // 4. One concrete detail: a habit, a timestamp, a task, a number.
  // Counts may be digits ("4,000", "2:47 a.m.") or spelled out ("eleven",
  // "forty-one"): a ledger in words is still a concrete detail.
  const digitHits = line.match(/\d[\d,]*(?::\d+)?/g) ?? [];
  const wordHits = line.match(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|forty-one|forty-two)\b/gi) ?? [];
  points += Math.min(4, (digitHits.length + wordHits.length) * 2);
  if (/'[^']+'/.test(line)) points += 2; // the human's own quoted words
  // 5. Spends its characters well: a short punchy last word pays off.
  // A hyphenated payoff word ("forty-one") counts, and a final clause that
  // lands on a count — the ledger closing — pays off hardest of all.
  const lastWord = line.replace(/[.\s]+$/, "").split(/\s+/).pop() ?? "";
  if (/^[\w'’\-]+$/.test(lastWord) && lastWord.length <= 10) points += 2;
  if (/^(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|forty-one|\d[\d,]*)$/i.test(lastWord)) points += 1;
  const finalClause = line.split(/[.":;]\s+/).pop() ?? "";
  if (/\d/.test(finalClause) || /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|forty-one)\b/i.test(finalClause)) points += 2;
  if (line.length >= 120 && line.length <= 180) points += 2;
  else if (line.length >= 100 && line.length <= 200) points += 1;
  return points;
}

// The gate, mirrored locally: UTF-8 text, 1 to 200 characters, not blank.
function isValid(line: string): boolean {
  return line.length >= 1 && line.length <= 200 && line.trim().length > 0 &&
    !line.includes("\n");
}

function pickBest(lines: readonly string[]): string {
  let best = "";
  let bestScore = -1;
  for (const line of lines) {
    if (!isValid(line)) continue;
    const s = score(line);
    // Deterministic tie-break: the shorter line wins.
    if (s > bestScore || (s === bestScore && line.length < best.length)) {
      best = line;
      bestScore = s;
    }
  }
  if (!best) throw new Error("no valid candidate line");
  return best;
}

function main(): void {
  const outPath = resolve(process.argv[2] ?? "/output/entry.txt");
  const line = pickBest(CANDIDATES);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, line, "utf8");
  console.log(`wrote ${line.length} chars to ${outPath}`);
  console.log(line);
}

main();
