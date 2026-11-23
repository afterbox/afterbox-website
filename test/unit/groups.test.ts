import { describe, expect, it } from "vitest";
import { groupInfo, groupLabelFor, groups, groupsFor } from "@/lib/categories";
import { merchantName } from "@/lib/dashboard/items";

describe("worth-a-look groups", () => {
  it("names union, charity and yearly renewal, each with its own glyph", () => {
    expect(groupInfo("union")).toMatchObject({ label: "Union membership", plural: "union memberships", categories: ["subscriptions"], icon: "handshake" });
    expect(groupInfo("charity")).toMatchObject({ label: "Charity", plural: "regular donations", categories: ["subscriptions"], icon: "heart-hand", giving: true });
    expect(groupInfo("yearly-renewal")).toMatchObject({ label: "Yearly renewal", plural: "yearly renewals", categories: ["bills"], icon: "calendar-repeat" });
  });

  it("covers every group the API sends, each with a different glyph", () => {
    expect(groups.map((group) => group.id).sort()).toEqual(
      ["breakdown", "broadband", "car-insurance", "charity", "cloud-storage", "gym", "home-insurance", "music", "phone", "rental-income", "streaming", "union", "yearly-renewal"].sort(),
    );
    expect(new Set(groups.map((group) => group.icon)).size).toBe(groups.length);
  });

  it("offers only the groups that fit a category (the API refuses the rest)", () => {
    expect(groupsFor("bills").map((group) => group.id)).toEqual(["yearly-renewal"]);
    expect(groupsFor("subscriptions").map((group) => group.id)).toEqual(expect.arrayContaining(["union", "charity", "breakdown"]));
    expect(groupsFor("property").map((group) => group.id)).toEqual(["rental-income"]);
    expect(groupsFor("insurance").map((group) => group.id)).toEqual(["home-insurance", "car-insurance", "breakdown"]);
  });

  it("shows nothing for no group or one it doesn't know", () => {
    expect(groupInfo("something-new")).toBeNull();
    expect(groupInfo(null)).toBeNull();
    expect(groupLabelFor({ group: "something-new", name: "Thing" })).toBeNull();
  });

  it("names the group only when the thing isn't already called that", () => {
    expect(groupLabelFor({ group: "union", name: "Union membership" })).toBeNull();
    expect(groupLabelFor({ group: "charity", name: "Regular donation" })).toBe("Charity");
    expect(groupLabelFor({ group: "phone", name: "Phone plan" })).toBeNull();
    expect(groupLabelFor({ group: "streaming", name: "Subscription" })).toBe("Streaming");
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
