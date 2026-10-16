const TAGS = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta"];

/** ~100KB of JSON, rebuilt on every call so the framework's serializer is exercised for real. */
export function buildLargePayload() {
  const items = [];
  for (let i = 0; i < 500; i++) {
    items.push({
      id: i,
      uuid: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
      name: `Item number ${i} with a reasonably descriptive name`,
      email: `user${i}@example.com`,
      score: (i * 7919) % 1000 / 10,
      active: i % 3 !== 0,
      tags: [TAGS[i % 8], TAGS[(i + 3) % 8], TAGS[(i + 5) % 8]],
      address: { street: `${i} Main Street`, city: "Springfield", zip: String(10000 + i), country: "US" },
      description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore",
    });
  }
  return { count: items.length, items };
}

export interface BulkItem { id: number; value: number; label: string }

export function summarizeBulk(items: BulkItem[]) {
  let sum = 0;
  for (const it of items) sum += it.value;
  return { count: items.length, sum };
}
