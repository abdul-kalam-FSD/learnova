import { describe, test, expect, beforeEach } from "vitest";
import api from "./axios";
import { setContestContext, getContestContext } from "./contestContext";

// Exercises the REQUEST interceptor in api/axios.js directly (same approach
// axios.test.js takes for the response interceptor): no network, the
// registered handler is invoked with a synthetic axios config.
const runRequestInterceptor = (config) => {
  const entry = api.interceptors.request.handlers.find((h) => h && h.fulfilled);
  return entry.fulfilled({ headers: {}, ...config });
};

const CTX = { id: "c1", gameType: "MATH_FRACTION_BUILDER", title: "Blitz" };

beforeEach(() => {
  localStorage.clear();
  setContestContext(null);
});

describe("contest context store", () => {
  test("keeps a valid context and rejects malformed ones", () => {
    setContestContext(CTX);
    expect(getContestContext()).toEqual(CTX);
    for (const bad of [null, undefined, {}, { id: "c1" }, { gameType: "X" }, { id: 5, gameType: "X" }, { id: "", gameType: "X" }]) {
      setContestContext(bad);
      expect(getContestContext()).toBeNull();
    }
  });
});

describe("request interceptor — contest id is only carried on the two game calls", () => {
  test("no contest context: requests are untouched", () => {
    const get = runRequestInterceptor({ method: "get", url: "/games/content", params: { gameType: "MATH_FRACTION_BUILDER" } });
    expect(get.params).toEqual({ gameType: "MATH_FRACTION_BUILDER" });
    const post = runRequestInterceptor({ method: "post", url: "/games/start", data: { gameType: "MATH_FRACTION_BUILDER", contentId: "g1" } });
    expect(post.data).toEqual({ gameType: "MATH_FRACTION_BUILDER", contentId: "g1" });
  });

  test("GET /games/content for the contest's game type gets contestId (other params kept)", () => {
    setContestContext(CTX);
    const out = runRequestInterceptor({ method: "get", url: "/games/content", params: { gameType: "MATH_FRACTION_BUILDER", foo: 1 } });
    expect(out.params).toEqual({ gameType: "MATH_FRACTION_BUILDER", foo: 1, contestId: "c1" });
  });

  test("POST /games/start for the contest's game type gets contestId (other fields kept)", () => {
    setContestContext(CTX);
    const out = runRequestInterceptor({ method: "post", url: "/games/start", data: { gameType: "MATH_FRACTION_BUILDER", contentId: "g1" } });
    expect(out.data).toEqual({ gameType: "MATH_FRACTION_BUILDER", contentId: "g1", contestId: "c1" });
  });

  test("a different game type never inherits the contest", () => {
    setContestContext(CTX);
    expect(runRequestInterceptor({ method: "get", url: "/games/content", params: { gameType: "MATH_FRACTION_MATCH" } }).params).toEqual({ gameType: "MATH_FRACTION_MATCH" });
    expect(runRequestInterceptor({ method: "post", url: "/games/start", data: { gameType: "MATH_FRACTION_MATCH", contentId: "g9" } }).data).toEqual({ gameType: "MATH_FRACTION_MATCH", contentId: "g9" });
  });

  test("no other endpoint is touched", () => {
    setContestContext(CTX);
    for (const [method, url, extra] of [
      ["get", "/home", {}],
      ["get", "/games/recommended", {}],
      ["get", "/games/catalog", {}],
      ["post", "/games/s1/attempt", { data: { gameType: "MATH_FRACTION_BUILDER" } }],
      ["post", "/games/s1/complete", {}],
      ["get", "/student/contests", {}],
    ]) {
      const out = runRequestInterceptor({ method, url, ...extra });
      expect(out.params).toBeUndefined();
      expect(out.data?.contestId).toBeUndefined();
    }
  });

  test("a contestId the caller set explicitly is not overwritten", () => {
    setContestContext(CTX);
    const out = runRequestInterceptor({ method: "post", url: "/games/start", data: { gameType: "MATH_FRACTION_BUILDER", contentId: "g1", contestId: "explicit" } });
    expect(out.data.contestId).toBe("explicit");
  });

  test("still attaches the auth token as before", () => {
    localStorage.setItem("token", "abc");
    setContestContext(CTX);
    const out = runRequestInterceptor({ method: "get", url: "/home" });
    expect(out.headers.Authorization).toBe("Bearer abc");
  });
});
