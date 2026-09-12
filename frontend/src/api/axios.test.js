import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";

// This exercises the response interceptor registered in api/axios.js
// directly, without a real HTTP call: axios exposes its registered
// handlers on interceptors.response.handlers, so the rejection
// handler can be invoked with a synthetic error the same way axios
// itself would call it after a real 401 response.
import api from "./axios";

function make401(url) {
  const error = new Error("Request failed with status code 401");
  error.response = { status: 401 };
  error.config = { url };
  return error;
}

function getRejectionHandler() {
  const handlers = api.interceptors.response.handlers;
  const entry = handlers.find((h) => h && h.rejected);
  return entry.rejected;
}

const originalLocation = window.location;

describe("axios 401 interceptor — AUTH_ATTEMPT_PATHS", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("token", "stale-token");
    localStorage.setItem("isGuest", "true");

    // jsdom (v30+) no longer allows redefining `window.location.assign`
    // via vi.spyOn, since `location` methods are non-configurable on
    // its Location object. Swap the whole `location` object out for a
    // plain mock instead, then restore the real one after each test so
    // this doesn't leak into other suites.
    delete window.location;
    window.location = { pathname: "/dashboard", assign: vi.fn() };
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  test("does NOT hijack a 401 from /auth/register (regression: old code checked the nonexistent /auth/signup)", async () => {
    const rejected = getRejectionHandler();
    await expect(rejected(make401("/auth/register"))).rejects.toBeTruthy();

    // The whole point of the exemption: leave the token/localStorage
    // alone and never force-navigate, so Signup.jsx's own catch block
    // is the one that handles this.
    expect(localStorage.getItem("token")).toBe("stale-token");
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  test("does NOT hijack a 401 from /auth/upgrade-guest (a stale guest token going stale mid-form)", async () => {
    const rejected = getRejectionHandler();
    await expect(rejected(make401("/auth/upgrade-guest"))).rejects.toBeTruthy();

    expect(localStorage.getItem("token")).toBe("stale-token");
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  test("does NOT hijack a 401 from /auth/login (wrong password is inline, not a session expiry)", async () => {
    const rejected = getRejectionHandler();
    await expect(rejected(make401("/auth/login"))).rejects.toBeTruthy();

    expect(localStorage.getItem("token")).toBe("stale-token");
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  test("DOES still treat a 401 from an ordinary protected endpoint as a real session expiry", async () => {
    const rejected = getRejectionHandler();
    await expect(rejected(make401("/games/catalog"))).rejects.toBeTruthy();

    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("isGuest")).toBeNull();
    expect(window.location.assign).toHaveBeenCalledWith(
      expect.stringContaining("/session-expired"),
    );
  });
});
