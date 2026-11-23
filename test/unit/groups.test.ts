import { describe, expect, it } from "vitest";
import { groupIcon, groupInfo, groupsFor } from "@/lib/categories";
import { merchantName } from "@/lib/dashboard/items";

describe("worth-a-look groups", () => {
  it("names the union and yearly-renewal groups, each with its own glyph", () => {
    expect(groupInfo("union")).toMatchObject({ label: "Union membership", plural: "union memberships", categories: ["subscriptions"] });
    expect(groupInfo("yearly-renewal")).toMatchObject({ label: "Yearly renewal", plural: "yearly renewals", categories: ["bills"] });
    expect(groupIcon(groupInfo("union")!)).toBe("handshake");
    expect(groupIcon(groupInfo("yearly-renewal")!)).toBe("calendar-repeat");
  });

  it("offers only the groups that fit a category (the API refuses the rest)", () => {
    expect(groupsFor("bills").map((group) => group.id)).toEqual(["yearly-renewal"]);
    expect(groupsFor("subscriptions").map((group) => group.id)).toContain("union");
    expect(groupsFor("property").map((group) => group.id)).toEqual(["rental-income"]);
    expect(groupsFor("insurance").map((group) => group.id)).toEqual(["home-insurance", "car-insurance", "breakdown"]);
  });

  it("falls back to the category's glyph, and to nothing for a group it doesn't know", () => {
    expect(groupIcon(groupInfo("gym")!)).toBe("repeat");
    expect(groupInfo("something-new")).toBeNull();
    expect(groupInfo(null)).toBeNull();
  });
});

describe("a merchant's second regular payment", () => {
  it.each([
    ["Lebara (second payment)", "Lebara"],
    ["Apple (third payment)", "Apple"],
    ["Sky (5th payment)", "Sky"],
    ["Lebara", "Lebara"],
    ["Marks (and Spencer)", "Marks (and Spencer)"],
    ["(second payment)", "(second payment)"],
  ])("names the company in sentences: %s → %s", (provider, company) => {
    expect(merchantName(provider)).toBe(company);
  });
});
