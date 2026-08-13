import { describe, expect, it } from "vitest";
import {
  activityLabel,
  couldUseEncouragement,
  firstNameOf,
  initialsOf,
  isUserId,
  nameOf,
  type CommunityProfile,
  type FriendSummary,
} from "@/lib/friends";

const profile: CommunityProfile = {
  userId: "1e2c1e5c-6d3a-4c9b-8f7e-2a1b3c4d5e6f",
  displayName: "Ada Lovelace",
  avatarUrl: null,
};

function friendWith(overrides: Partial<FriendSummary>): FriendSummary {
  return {
    friendshipId: "f1",
    profile,
    streak: 0,
    chapters: 0,
    lastReadDate: null,
    readToday: false,
    daysSinceRead: null,
    since: null,
    ...overrides,
  };
}

describe("activityLabel", () => {
  it("distinguishes today, yesterday and this week", () => {
    expect(activityLabel(friendWith({ lastReadDate: "2026-08-13", daysSinceRead: 0 }))).toBe(
      "Read today",
    );
    expect(activityLabel(friendWith({ lastReadDate: "2026-08-12", daysSinceRead: 1 }))).toBe(
      "Read yesterday",
    );
    expect(activityLabel(friendWith({ lastReadDate: "2026-08-09", daysSinceRead: 4 }))).toBe(
      "Read 4 days ago",
    );
  });

  it("goes vague past a week rather than counting up an accusation", () => {
    expect(activityLabel(friendWith({ lastReadDate: "2026-08-01", daysSinceRead: 12 }))).toBe(
      "Read last week",
    );
    expect(activityLabel(friendWith({ lastReadDate: "2026-06-01", daysSinceRead: 73 }))).toBe(
      "Read a while ago",
    );
  });

  it("says so when someone has never read", () => {
    expect(activityLabel(friendWith({}))).toBe("Not started yet");
  });
});

describe("couldUseEncouragement", () => {
  it("stays quiet for someone who read today or yesterday", () => {
    expect(couldUseEncouragement(friendWith({ daysSinceRead: 0 }))).toBe(false);
    expect(couldUseEncouragement(friendWith({ daysSinceRead: 1 }))).toBe(false);
  });

  it("offers once a friend has been away two days", () => {
    expect(couldUseEncouragement(friendWith({ daysSinceRead: 2 }))).toBe(true);
  });

  it("does not nag someone who has not started", () => {
    expect(couldUseEncouragement(friendWith({ daysSinceRead: null }))).toBe(false);
  });
});

describe("isUserId", () => {
  it("accepts a v4 uuid and rejects anything else", () => {
    expect(isUserId(profile.userId)).toBe(true);
    expect(isUserId("not-a-uuid")).toBe(false);
    // An invite link is user-supplied input; a bare wildcard must not pass.
    expect(isUserId("%")).toBe(false);
    expect(isUserId("")).toBe(false);
  });
});

describe("naming", () => {
  it("falls back to something readable when a name is missing", () => {
    const anonymous = { ...profile, displayName: null };
    expect(nameOf(anonymous)).toBe("Unnamed reader");
    expect(initialsOf(anonymous)).toBe("?");
  });

  it("takes initials from the first and last word", () => {
    expect(initialsOf(profile)).toBe("AL");
    expect(initialsOf({ ...profile, displayName: "Ada" })).toBe("AD");
  });

  it("uses the first name for sentence-cased copy", () => {
    expect(firstNameOf(profile)).toBe("Ada");
  });
});
