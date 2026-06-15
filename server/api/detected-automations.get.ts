import { Octokit } from "octokit";
import {
  DetectedAutomation,
  type DetectedAutomationResponse,
} from "~~/shared/types/automation";
import { identityConfig } from "@unveil/identity";
import { cicdBots } from "~~/shared/daily-scan";
import dayjs from "dayjs";

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
    const scanned = JSON.parse(content) as DetectedAutomationResponse[];
    const dates = [
      ...new Set(scanned.map((item) => item.created_at)),
    ].toSorted();

    const lastScanDate = dates.toReversed()[0];

    const results: DetectedAutomation[] = scanned.reduce<DetectedAutomation[]>(
      (coll, item) => {
        const isLastScannedBatch = dayjs(item.created_at).isSame(
          lastScanDate,
          "day",
        );

        if (
          !item.username ||
          cicdBots.includes(item.username) ||
          item.score >= identityConfig.THRESHOLD_HUMAN ||
          !isLastScannedBatch
        ) {
          return coll;
        }

        const automation = coll.find(
          (collItem) => collItem.userId === item.user_id,
        );

        if (automation) {
          automation.totalPrs++;
        } else {
          coll.push({
            username: item.username,
            userId: item.user_id,
            totalPrs: 1,
            score: item.score,
            classification: classifyByScore(item.score),
          });
        }

        return coll;
      },
      [],
    );

    return {
      results,
      lastScanDate,
    };
  } catch {
    throw createError({
      statusCode: 500,
      message: "Failed to fetch verified automations list",
    });
  }
});
