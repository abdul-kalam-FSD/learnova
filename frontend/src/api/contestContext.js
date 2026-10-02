// Which contest (if any) the CURRENT screen was launched from.
//
// Learnova's ~54 games each call GET /games/content and POST /games/start
// themselves through the shared `api` instance, so there is no single place
// to say "this play belongs to a contest". Instead the contest page
// navigates to a game route with { state: { contest: { id, gameType, title } } };
// ContestContextSync (mounted once, in AppLayout) publishes that here, and
// the request interceptor in api/axios.js adds the contestId to those two
// calls.
//
// This is only a convenience for carrying the id along. It grants nothing:
// the server re-validates the contest (published, this student's grade,
// active now, the game really is one of its challenges) on every request,
// and ignores the id entirely for anything else.

let current = null;

export function setContestContext(ctx) {
  current =
    ctx && typeof ctx.id === "string" && ctx.id && typeof ctx.gameType === "string" && ctx.gameType
      ? { id: ctx.id, gameType: ctx.gameType, title: ctx.title || "" }
      : null;
}

export function getContestContext() {
  return current;
}
