import { access, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const SOURCE = 'https://cv.iptc.org/newscodes/mediatopic/?format=json&lang=en-GB';
const OUTPUT = new URL('../lib/iptc-media-topics.generated.json', import.meta.url);

function cleanQcode(value) {
  if (!value) return null;
  const text = String(value).trim();
  const fromUri = text.match(/\/mediatopic\/([^/?#]+)$/)?.[1];
  return (fromUri || text.replace(/^medtop:/, '')).trim();
}

function languageValue(value) {
  if (!value || typeof value !== 'object') return '';
  return value['en-GB'] || value['en-US'] || Object.values(value).find((item) => typeof item === 'string') || '';
}

async function localSnapshotExists() {
  try {
    await access(OUTPUT, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function readLocalSnapshot() {
  try {
    return JSON.parse(await readFile(OUTPUT, 'utf8'));
  } catch {
    return null;
  }
}

async function main() {
  const local = await readLocalSnapshot();
  const generatedAt = Date.parse(String(local?.generatedAt || ''));
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  if (local?.complete === true && Number.isFinite(generatedAt) && Date.now() - generatedAt < sevenDays) {
    console.log(`IPTC snapshot is current (${local.topics?.length || 0} topics); skipping refresh.`);
    return;
  }

  let response;
  try {
    response = await fetch(SOURCE, {
      headers: { accept: 'application/json, application/ld+json' },
      signal: AbortSignal.timeout(20000)
    });
  } catch (error) {
    if (local?.complete === true) {
      console.warn(`IPTC sync unavailable (${error?.message || error}); using complete checked-in snapshot.`);
      return;
    }
    if (process.env.IPTC_ALLOW_BOOTSTRAP === '1' && await localSnapshotExists()) {
      console.warn(`IPTC sync unavailable (${error?.message || error}); IPTC_ALLOW_BOOTSTRAP=1 so the small development bootstrap will be used.`);
      return;
    }
    throw new Error(`Could not download the full IPTC Media Topics vocabulary and the checked-in snapshot is only a bootstrap. Connect to the internet and run npm run sync:iptc. Original error: ${error?.message || error}`);
  }

  if (!response.ok) {
    if (local?.complete === true) {
      console.warn(`IPTC sync returned ${response.status}; using complete checked-in snapshot.`);
      return;
    }
    if (process.env.IPTC_ALLOW_BOOTSTRAP === '1' && await localSnapshotExists()) {
      console.warn(`IPTC sync returned ${response.status}; IPTC_ALLOW_BOOTSTRAP=1 so the small development bootstrap will be used.`);
      return;
    }
    throw new Error(`Failed to fetch the full IPTC Media Topics vocabulary: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  const conceptSet = Array.isArray(payload.conceptSet) ? payload.conceptSet : [];

  const active = conceptSet
    .filter((concept) => !concept.retired)
    .map((concept) => ({
      qcode: cleanQcode(concept.qcode || concept.uri),
      label: languageValue(concept.prefLabel),
      definition: languageValue(concept.definition),
      parentQcode: Array.isArray(concept.broader) && concept.broader.length
        ? cleanQcode(concept.broader[0])
        : null
    }))
    .filter((topic) => topic.qcode && topic.label);

  if (active.length < 1000) {
    throw new Error(`Refusing to replace IPTC snapshot: expected 1000+ active topics, got ${active.length}`);
  }

  const byQcode = new Map(active.map((topic) => [topic.qcode, topic]));

  function lineage(qcode) {
    const result = [];
    const seen = new Set();
    let current = byQcode.get(qcode);
    while (current && !seen.has(current.qcode)) {
      seen.add(current.qcode);
      result.push(current.qcode);
      current = current.parentQcode ? byQcode.get(current.parentQcode) : undefined;
    }
    return result;
  }

  const topics = active.map((topic) => {
    const path = lineage(topic.qcode);
    return {
      ...topic,
      depth: path.length,
      topLevelQcode: path[path.length - 1] || topic.qcode
    };
  });

  const output = {
    source: SOURCE,
    sourceReleasedAt: payload.dateReleased || null,
    generatedAt: new Date().toISOString(),
    licence: payload.licenceLink || 'https://creativecommons.org/licenses/by/4.0/',
    complete: true,
    topics
  };

  await writeFile(OUTPUT, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${topics.length} active IPTC Media Topics (${output.sourceReleasedAt || 'release date unknown'}).`);
}

await main();
