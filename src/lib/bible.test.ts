import { describe, expect, it } from "vitest";
import { getBookId, sanitizeVerseHtml } from "@/lib/bible";
import { readingLists } from "@/lib/readingPlan";

describe("getBookId", () => {
  it("resolves every book named in the reading plan", () => {
    // Guards the seam between plan data and the API's book numbering — a rename
    // on either side would otherwise surface as a silently broken reader.
    for (const list of readingLists) {
      for (const book of list.books) {
        expect(getBookId(book.name), book.name).not.toBeNull();
      }
    }
  });

  it("accepts common alternate names", () => {
    expect(getBookId("Song of Songs")).toBe(22);
    expect(getBookId("Psalm")).toBe(19);
  });

  it("returns null for an unknown book", () => {
    expect(getBookId("Nonexistent")).toBeNull();
  });
});

describe("sanitizeVerseHtml", () => {
  it("removes Strong's numbers and footnote markers", () => {
    expect(sanitizeVerseHtml("God<S>430</S> created the deep<sup>a</sup> waters")).toBe(
      "God created the deep waters",
    );
  });

  it("preserves translator italics", () => {
    expect(sanitizeVerseHtml("the Spirit <i>of God</i>")).toBe("the Spirit <i>of God</i>");
    expect(sanitizeVerseHtml("<em>truly</em>")).toBe("<i>truly</i>");
  });

  it("keeps line breaks, which carry meaning in this data", () => {
    // The API separates an editorial section heading from the verse with a
    // <br/>. Dropping it fused the two together: "…MagiAfter Jesus was born".
    expect(sanitizeVerseHtml("The Visit of the Magi<br/>After Jesus was born")).toBe(
      "The Visit of the Magi<br>After Jesus was born",
    );
    // The same tag breaks poetic lines throughout the Psalms.
    expect(sanitizeVerseHtml("Blessed is the one<br/>who does not walk")).toBe(
      "Blessed is the one<br>who does not walk",
    );
  });

  it("strips scripts and event handlers from third-party markup", () => {
    expect(sanitizeVerseHtml('Light<script>alert(1)</script>')).toBe("Light");
    expect(sanitizeVerseHtml('<img src=x onerror="alert(1)">Light')).toBe("Light");
    expect(sanitizeVerseHtml('<a href="javascript:alert(1)">click</a>')).toBe("click");
  });
});
