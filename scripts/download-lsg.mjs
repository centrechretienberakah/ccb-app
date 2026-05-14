/**
 * Download LSG Bible from getbible.net and save as static JSON files
 * Output: public/bible/lsg/{bookNumber}/{chapter}.json
 * Each file: [{verse: 1, text: "..."}, ...]
 *
 * Usage: node scripts/download-lsg.mjs
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "public", "bible", "lsg");

// Total books in the Bible
const TOTAL_BOOKS = 66;
const DELAY_MS = 300; // polite delay between requests

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchBook(bookNum) {
  const url = `https://getbible.net/v2/lsg/${bookNum}.json`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "CCB-App/1.0 Bible downloader",
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for book ${bookNum}`);
  return res.json();
}

async function main() {
  console.log("📖 Démarrage du téléchargement de la Bible LSG...\n");
  mkdirSync(OUT, { recursive: true });

  let totalChapters = 0;
  let totalVerses = 0;
  const errors = [];

  for (let bookNum = 1; bookNum <= TOTAL_BOOKS; bookNum++) {
    const bookDir = join(OUT, String(bookNum));
    mkdirSync(bookDir, { recursive: true });

    let bookData;
    try {
      console.log(`[${bookNum}/${TOTAL_BOOKS}] Téléchargement du livre ${bookNum}...`);
      bookData = await fetchBook(bookNum);
    } catch (err) {
      console.error(`  ❌ Erreur livre ${bookNum}: ${err.message}`);
      errors.push({ bookNum, error: err.message });
      await sleep(DELAY_MS * 3);
      continue;
    }

    // bookData.chapters is an object: { "1": { chapter: "1", verses: { "1": { verse_nr: "1", verse: "text" }, ... } } }
    const chapters = bookData.chapters || {};
    const chapterNums = Object.keys(chapters).sort((a, b) => parseInt(a) - parseInt(b));

    for (const chNum of chapterNums) {
      const chData = chapters[chNum];
      const rawVerses = chData.verses || {};
      const verses = Object.values(rawVerses)
        .map((v) => ({
          verse: parseInt(v.verse_nr),
          text: (v.verse || "").trim().replace(/\n/g, " "),
        }))
        .filter((v) => v.text.length > 0)
        .sort((a, b) => a.verse - b.verse);

      if (verses.length > 0) {
        const outFile = join(bookDir, `${chNum}.json`);
        writeFileSync(outFile, JSON.stringify(verses), "utf-8");
        totalVerses += verses.length;
        totalChapters++;
      }
    }

    const bookName = bookData.name || `Livre ${bookNum}`;
    console.log(
      `  ✅ ${bookName} — ${chapterNums.length} chapitres sauvegardés`
    );

    await sleep(DELAY_MS);
  }

  console.log("\n========================================");
  console.log(`✅ Téléchargement terminé !`);
  console.log(`   ${totalChapters} chapitres, ${totalVerses} versets`);
  if (errors.length > 0) {
    console.log(`\n⚠️  Erreurs sur ${errors.length} livres :`);
    errors.forEach((e) => console.log(`   Livre ${e.bookNum}: ${e.error}`));
  }
  console.log(`\nFichiers sauvegardés dans : public/bible/lsg/`);
}

main().catch((err) => {
  console.error("Erreur fatale:", err);
  process.exit(1);
});
