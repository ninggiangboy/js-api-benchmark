import http from "k6/http";

const BASE = __ENV.BASE;
const TOKEN = __ENV.TOKEN;
const JSON_H = { "content-type": "application/json" };

http.setResponseCallback(http.expectedStatuses(200, 201));

export const options = {
  scenarios: {
    mix: {
      executor: "constant-arrival-rate",
      rate: Number(__ENV.RATE || 1500),
      timeUnit: "1s",
      duration: __ENV.DURATION || "30s",
      preAllocatedVUs: 100,
      maxVUs: 800,
    },
  },
  summaryTrendStats: ["avg", "med", "p(90)", "p(95)", "p(99)", "max"],
};

const rand = (n) => 1 + Math.floor(Math.random() * n);

// 45% user read, 15% post list, 20% cached post, 6% create, 4% patch, 5% feed, 5% login
export default function () {
  const r = Math.random() * 100;
  if (r < 45) http.get(`${BASE}/users/${rand(10000)}`, { tags: { name: "user_get" } });
  else if (r < 60) http.get(`${BASE}/posts?limit=20&offset=${rand(999)}`, { tags: { name: "posts_list" } });
  else if (r < 80) http.get(`${BASE}/cache/posts/${rand(999)}`, { tags: { name: "cache_post" } });
  else if (r < 86) {
    const n = Math.floor(Math.random() * 1e9);
    http.post(`${BASE}/users`, JSON.stringify({ email: `mix${n}@bench.example.com`, name: `Mix ${n}` }), { headers: JSON_H, tags: { name: "user_create" } });
  } else if (r < 90) http.patch(`${BASE}/users/${rand(10000)}`, JSON.stringify({ name: "Patched Name" }), { headers: JSON_H, tags: { name: "user_patch" } });
  else if (r < 95) http.get(`${BASE}/me/feed`, { headers: { authorization: `Bearer ${TOKEN}`, origin: "http://example.com" }, tags: { name: "feed" } });
  else http.post(`${BASE}/auth/login`, JSON.stringify({ email: "user1@example.com", password: "password123" }), { headers: JSON_H, tags: { name: "login" } });
}
