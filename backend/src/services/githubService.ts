import { prisma } from '../config/db';
import { logger } from '../utils/logger';

interface GitHubRepoResponse {
  name: string;
  full_name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  [key: string]: unknown;
}

/**
 * Syncs GitHub repository statistics to the database.
 * If personal access token is configured, uses it to avoid API rate limiting.
 */
export const syncGitHubRepoStats = async (repoNames: string[]): Promise<boolean> => {
  try {
    const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    logger.info(`Starting synchronization of ${repoNames.length} GitHub repositories...`);

    const syncOperations = repoNames.map(async (repoName) => {
      try {
        const response = await fetch(`https://api.github.com/repos/${repoName}`, { headers });
        
        if (!response.ok) {
          logger.warn(`GitHub API lookup failed for ${repoName} (Status: ${response.status})`);
          return;
        }

        const data = (await response.json()) as GitHubRepoResponse;

        // Upsert stats in database
        const record = await prisma.openSourceRepo.upsert({
          where: { repoName },
          update: {
            description: data.description,
            stars: data.stargazers_count,
            forks: data.forks_count,
            language: data.language,
          },
          create: {
            repoName,
            description: data.description,
            stars: data.stargazers_count,
            forks: data.forks_count,
            language: data.language,
          },
        });

        logger.debug(`Synced GitHub repo: ${record.repoName} (Stars: ${record.stars})`);
      } catch (error: any) {
        logger.error(`Error syncing stats for single repo ${repoName}:`, error.message);
      }
    });

    await Promise.all(syncOperations);
    logger.info('GitHub repository stats synchronization completed.');
    return true;
  } catch (error: any) {
    logger.error('Master GitHub synchronization batch failed:', error.message);
    return false;
  }
};
