<script setup lang="ts">
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const { data, error } = await useDetectedAutomations();
const search = ref("");

const fuzzySearch = (query: string, text: string): boolean => {
  const queryTrimmed = query.toLowerCase();
  let textIndex = 0;

  for (let i = 0; i < queryTrimmed.length; i++) {
    textIndex = text.toLowerCase().indexOf(queryTrimmed[i] ?? "", textIndex);
    if (textIndex === -1) return false;
    textIndex++;
  }

  return true;
};

const items = computed<DetectedAutomation[]>(() => {
  const results = data.value?.results ?? [];
  return results.toSorted((a, b) => b.totalPrs - a.totalPrs);
});

const filteredItems = computed<DetectedAutomation[]>(() => {
  const query = search.value.trim();

  if (!query) {
    return items.value;
  }

  return items.value.filter((item) => fuzzySearch(query, item.username));
});

useHead({
  title: "Daily signals | AgentScan",
  meta: [
    { property: "og:title", content: "Daily signals | AgentScan" },
    {
      property: "og:description",
      content:
        "Accounts identified by the daily Ecosystem Health scan as showing signs of automated behavior.",
    },
    { property: "og:type", content: "website" },
  ],
});
</script>

<template>
  <header class="text-center md:text-left text-pretty">
    <h1 class="text-2xl font-semibold">Daily signals</h1>
    <p class="text-gh-muted mt-2">
      Accounts identified by the daily
      <NuxtLink to="/health" class="underline hover:text-gh-text">
        Ecosystem Health
      </NuxtLink>
      scan as showing signs of automated behavior.
    </p>

    <p v-if="data?.lastScanDate" class="mt-6 text-sm text-gh-text">
      Last updated: <NuxtTime :datetime="data.lastScanDate" />
    </p>

    <input
      v-model="search"
      type="text"
      placeholder="Search by username..."
      class="mt-12 w-full px-3 py-2 bg-gh-bg border border-gh-border rounded text-sm text-gh-text placeholder:text-gh-muted focus:outline-none focus:border-gh-border/80"
    />
  </header>

  <div v-if="data" class="mt-12">
    <div v-if="filteredItems.length === 0" class="text-center py-8">
      <p class="text-gh-muted">No accounts found matching "{{ search }}"</p>
    </div>
    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gh-border-light">
            <th class="text-left py-2 px-3 font-semibold text-gh-text">
              Username
            </th>
            <th class="text-right py-2 px-3 font-semibold text-gh-text">
              Classification (at time of scan)
            </th>
            <th class="text-right py-2 px-3 font-semibold text-gh-text">
              Pull Requests
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in filteredItems"
            :key="item.userId"
            class="not-last:border-b border-gh-border-light/40 hover:bg-gh-border/10 transition-colors"
          >
            <td class="py-3 px-3">
              <NuxtLink
                :to="`/user/${item.username}`"
                class="font-mono flex items-center gap-2 underline font-semibold text-gh-accent hover:underline transition-colors"
              >
                <span class="i-lucide:user-round"></span>
                <span>{{ item.username ?? `User ${item.userId}` }}</span>
              </NuxtLink>
            </td>
            <td class="py-3 px-3 text-right text-gh-muted">
              {{ item.classification }} ({{ item.score }} points)
            </td>
            <td class="py-3 px-3 text-right text-gh-muted">
              {{ item.totalPrs }} PR{{ item.totalPrs === 1 ? "" : "s" }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  <div v-else-if="error">
    {{ error.message }}
  </div>
</template>
