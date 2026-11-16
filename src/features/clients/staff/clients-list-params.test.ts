// @vitest-environment node
import { describe, expect, it } from "vitest";

import { clientsListHref, parseClientsListParams } from "./clients-list-params";

describe("parseClientsListParams", () => {
  it("defaults to the active list, no search and the first page", () => {
    expect(parseClientsListParams({})).toEqual({ q: "", page: 1, status: "active", expiringSoon: false });
  });

  it("reads the deactivated filter, the search and the page", () => {
    expect(parseClientsListParams({ status: "deactivated", q: "ana", page: "3" })).toEqual({
      q: "ana",
      page: 3,
      status: "deactivated",
      expiringSoon: false,
    });
  });

  it("trims the search and takes the first value of a repeated parameter", () => {
    expect(parseClientsListParams({ q: ["  ana  ", "bruno"], status: ["deactivated", "active"] })).toEqual({
      q: "ana",
      page: 1,
      status: "deactivated",
      expiringSoon: false,
    });
  });

  it.each(["", "todos", "ACTIVE", "inactive"])("falls back to the active list for the status %j", (status) => {
    expect(parseClientsListParams({ status }).status).toBe("active");
  });

  it("parses vence=pronto and builds it back", () => {
    const params = parseClientsListParams({ vence: "pronto" });

    expect(params).toEqual({ q: "", page: 1, status: "active", expiringSoon: true });
    expect(clientsListHref(params)).toBe("/staff/clients?vence=pronto");
  });

  it.each(["", "ya", "PRONTO"])("ignores vence=%j", (vence) => {
    expect(parseClientsListParams({ vence }).expiringSoon).toBe(false);
  });

  it("does not combine vence=pronto with the deactivated list", () => {
    expect(parseClientsListParams({ vence: "pronto", status: "deactivated" }).expiringSoon).toBe(false);
  });

  it.each(["abc", "0", "-2", "1.5", ""])("falls back to page 1 for the page %j", (page) => {
    expect(parseClientsListParams({ page }).page).toBe(1);
  });
});

describe("clientsListHref", () => {
  it("is the bare path for the default view", () => {
    expect(clientsListHref({ q: "", page: 1, status: "active", expiringSoon: false })).toBe("/staff/clients");
  });

  it("names only what is not the default", () => {
    expect(clientsListHref({ q: "", page: 1, status: "deactivated", expiringSoon: false })).toBe("/staff/clients?status=deactivated");
    expect(clientsListHref({ q: "ana", page: 2, status: "active", expiringSoon: false })).toBe("/staff/clients?q=ana&page=2");
    expect(clientsListHref({ q: "ana", page: 1, status: "deactivated", expiringSoon: false })).toBe(
      "/staff/clients?status=deactivated&q=ana",
    );
  });

  it("encodes the search", () => {
    expect(clientsListHref({ q: "ana gómez&x", page: 1, status: "active", expiringSoon: false })).toBe(
      "/staff/clients?q=ana+g%C3%B3mez%26x",
    );
  });
});
