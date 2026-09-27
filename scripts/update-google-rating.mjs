// Reads RSK Solar Energy's Google rating and review count from the Places API and writes them to
// src/data/google-rating.json, which every page takes its rating from (via BUSINESS.google).
//
// Run daily by .github/workflows/google-rating.yml. Needs GOOGLE_PLACES_API_KEY. The file is only
// rewritten when the rating or the count has changed, so an unchanged day makes no commit and no
// deploy.
//
// A sudden large change (the count falling by more than 5, or the rating moving by more than 0.3)
// is refused, because it is more likely a wrong answer than real reviews. Google does sometimes
// remove reviews; once you have checked the profile, rerun with ACCEPT_LARGE_CHANGE=1.
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";

const PLACE_ID = "ChIJK-ncoCnvDzkRBQ5k6r_hIjY";
const FILE = new URL("../src/data/google-rating.json", import.meta.url);

async function main() {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    console.error("GOOGLE_PLACES_API_KEY is not set.");
    return 1;
  }

  const res = await fetch(
    `https://places.googleapis.com/v1/places/${PLACE_ID}`,
    {
      headers: {
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "rating,userRatingCount",
      },
    },
  );
  if (!res.ok) {
    // The body names the problem (key restricted, API not enabled, billing) without echoing the key.
    console.error(
      `Places API answered ${res.status}: ${(await res.text()).slice(0, 500)}`,
    );
    return 1;
  }
  const place = await res.json();
  const rating = Math.round(Number(place.rating) * 10) / 10;
  const reviewCount = Number(place.userRatingCount);

  if (
    !(rating >= 1 && rating <= 5) ||
    !Number.isInteger(reviewCount) ||
    reviewCount < 1
  ) {
    console.error(`Unexpected answer from Google: ${JSON.stringify(place)}`);
    return 1;
  }

  const current = JSON.parse(readFileSync(FILE, "utf8"));
  const output = (line) =>
    process.env.GITHUB_OUTPUT &&
    appendFileSync(process.env.GITHUB_OUTPUT, `${line}\n`);

  if (rating === current.rating && reviewCount === current.reviewCount) {
    console.log(`No change: ${rating} from ${reviewCount} reviews.`);
    output("changed=false");
    return 0;
  }

  const largeChange =
    current.reviewCount - reviewCount > 5 ||
    Math.abs(rating - current.rating) > 0.3;
  if (largeChange && process.env.ACCEPT_LARGE_CHANGE !== "1") {
    console.error(
      `Refusing a large change: ${current.rating} from ${current.reviewCount} reviews to ${rating} from ${reviewCount}. ` +
        'Check the Google profile, then rerun with "Accept a large change" ticked.',
    );
    return 1;
  }

  const checkedOn = new Date().toISOString().slice(0, 10);
  writeFileSync(
    FILE,
    `${JSON.stringify({ rating, reviewCount, checkedOn }, null, 2)}\n`,
  );
  const summary = `${current.rating} from ${current.reviewCount} reviews -> ${rating} from ${reviewCount}`;
  console.log(`Updated: ${summary}`);
  output("changed=true");
  output(`summary=${summary}`);
  return 0;
}

// Set the exit code instead of calling process.exit, which can abort on Windows while fetch is closing.
process.exitCode = await main();
