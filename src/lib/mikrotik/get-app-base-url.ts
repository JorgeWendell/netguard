function pickReachableUrl(candidates: Array<string | undefined>): string {
  const normalized = candidates
    .map((candidate) => candidate?.trim())
    .filter((candidate): candidate is string => Boolean(candidate))
    .map((candidate) => candidate.replace(/\/$/, ""));

  const lanCandidate = normalized.find(
    (candidate) => !/localhost|127\.0\.0\.1/i.test(candidate),
  );

  if (lanCandidate) {
    return lanCandidate;
  }

  return normalized[0] ?? "http://localhost:3000";
}

export function getAppBaseUrl(): string {
  return pickReachableUrl([
    process.env.APP_URL,
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_BASE_URL,
  ]);
}
