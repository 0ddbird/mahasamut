/**
 * Points for a question and ranking of the players in a room.
 *
 * A wrong answer (or no answer) gives 0. A right answer gives between 50 (at
 * the deadline) and 100 (instant), so that being right always beats being fast.
 */

export function questionPoints(correct: boolean, delayMs: number, totalMs: number): number {
  if (!correct) return 0;
  const ratio = Math.min(1, Math.max(0, delayMs / totalMs));
  return Math.round(50 + 50 * (1 - ratio));
}

export function rankPlayers(
  players: readonly { pseudo: string; score: number }[],
): { rank: number; pseudo: string; score: number }[] {
  const sorted = [...players].sort((a, b) => b.score - a.score || a.pseudo.localeCompare(b.pseudo));
  return sorted.map((player) => ({
    rank: 1 + sorted.filter((other) => other.score > player.score).length,
    pseudo: player.pseudo,
    score: player.score,
  }));
}
