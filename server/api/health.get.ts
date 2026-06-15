import { Octokit } from "octokit";
import type {
  EcosystemHealthItem,
  EcosystemHealthCategoryProgression,
} from "~~/shared/types/ecosystem-health";

export default defineEventHandler(async () => {
  const config = useRuntimeConfig();
  const octokit = new Octokit({ auth: config.githubToken });

  try {
    // Step 1: Get the file metadata (sha) without content
    const { data: fileData } = await octokit.rest.repos.getContent({
      owner: "matteogabriele",
      repo: "agentscan",
      path: "data/scan-results.json",
    });

    if (!("sha" in fileData)) {
      throw new Error("Unexpected response: not a file");
    }

    // Step 2: Fetch the full blob using the sha — no size limit
    const { data: blobData } = await octokit.rest.git.getBlob({
      owner: "matteogabriele",
      repo: "agentscan",
      file_sha: fileData.sha,
    });

    const content = Buffer.from(blobData.content, "base64").toString("utf-8");
    const results: EcosystemHealthItem[] = JSON.parse(content);

    const automation: number[] = [];
    const mixed: number[] = [];
    const organic: number[] = [];

    const countsByDate = countClassificationByDate(results);
    const dates = Object.keys(countsByDate).sort();

    dates.forEach((date) => {
      const counts = countsByDate[date];
      if (!counts) return;

      automation.push(counts.automation.count);
      mixed.push(counts.mixed.count);
      organic.push(counts.organic.count);

      counts.automation.trend = calcLinearProgression(automation).trend;
      counts.mixed.trend = calcLinearProgression(mixed).trend;
      counts.organic.trend = calcLinearProgression(organic).trend;
    });

    const categoryProgression: EcosystemHealthCategoryProgression = {
      automation: calcLinearProgression(automation),
      mixed: calcLinearProgression(mixed),
      organic: calcLinearProgression(organic),
    };

    return {
      results,
      categoryProgression,
      countsByDate,
      dates,
    };
  } catch (error) {
    console.error("Ecosystem health fetch error:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch verified automations list",
    });
  }
});
