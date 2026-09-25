export function sortRankingRows(rows) {
  return [...rows].sort((left, right) => {
    if (right.totalScore !== left.totalScore) {
      return right.totalScore - left.totalScore;
    }

    if (left.totalDuration !== right.totalDuration) {
      return left.totalDuration - right.totalDuration;
    }

    return new Date(left.firstSubmissionAt) - new Date(right.firstSubmissionAt);
  });
}

export function attachRankingPosition(rows) {
  return sortRankingRows(rows).map((row, index) => ({
    ...row,
    position: index + 1
  }));
}

