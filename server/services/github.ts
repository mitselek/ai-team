
import { Octokit } from '@octokit/rest';
import { createLogger } from '../utils/logger';

const logger = createLogger('github-service');

let octokit: Octokit;

function getOctokit(): Octokit {
  if (!octokit) {
    const config = useRuntimeConfig();
    const githubToken = config.NUXT_GITHUB_TOKEN;

    if (!githubToken) {
      logger.error('NUXT_GITHUB_TOKEN is not configured.');
      throw new Error('GitHub token is not configured.');
    }

    octokit = new Octokit({ auth: githubToken });
  }
  return octokit;
}

export async function createOrgRepository(orgName: string, description: string, repo: string) {
  const log = logger.child({ action: 'createOrgRepository', orgName, repo });
  log.info('Attempting to create organization repository');

  try {
    const response = await getOctokit().repos.createInOrg({
      org: orgName,
      name: repo,
      description,
    });
    log.info('Successfully created organization repository');
    return response.data;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error({ error: message }, 'Failed to create organization repository');
    throw error;
  }
}

export async function createIssue(owner: string, repo: string, title: string, body: string) {
  const log = logger.child({ action: 'createIssue', owner, repo, title });
  log.info('Attempting to create issue');

  try {
    const response = await getOctokit().issues.create({
      owner,
      repo,
      title,
      body,
    });
    log.info('Successfully created issue');
    return response.data;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error({ error: message }, 'Failed to create issue');
    throw error;
  }
}

export async function createWikiPage(owner: string, repo: string, title: string, content: string): Promise<{ title: string; content: string }> {
  const log = logger.child({ action: 'createWikiPage', owner, repo, title });
  log.info('Attempting to create wiki page');

  try {
    // The Octokit REST API does not have a direct method for creating wiki pages.
    // This is a workaround using the Git database API to create a new page.
    // This assumes the wiki repository exists and is initialized.
    const wikiRepo = `${repo}.wiki`;
    const path = `${title}.md`;

    // Step 1: Get the latest commit SHA of the master branch
    const { data: refData } = await getOctokit().git.getRef({
      owner,
      repo: wikiRepo,
      ref: 'heads/master',
    });
    const latestCommitSha = refData.object.sha;

    // Step 2: Get the tree associated with the latest commit
    const { data: commitData } = await getOctokit().git.getCommit({
      owner,
      repo: wikiRepo,
      commit_sha: latestCommitSha,
    });
    const treeSha = commitData.tree.sha;

    // Step 3: Create a new blob with the content of the wiki page
    const { data: blobData } = await getOctokit().git.createBlob({
      owner,
      repo: wikiRepo,
      content,
      encoding: 'utf-8',
    });

    // Step 4: Create a new tree with the new file
    const { data: newTreeData } = await getOctokit().git.createTree({
      owner,
      repo: wikiRepo,
      base_tree: treeSha,
      tree: [
        {
          path,
          mode: '100644',
          type: 'blob',
          sha: blobData.sha,
        },
      ],
    });

    // Step 5: Create a new commit with the new tree
    const { data: newCommitData } = await getOctokit().git.createCommit({
      owner,
      repo: wikiRepo,
      message: `Create ${title} wiki page`,
      tree: newTreeData.sha,
      parents: [latestCommitSha],
    });

    // Step 6: Update the master branch to point to the new commit
    await getOctokit().git.updateRef({
      owner,
      repo: wikiRepo,
      ref: 'heads/master',
      sha: newCommitData.sha,
    });

    log.info('Successfully created wiki page');
    return { title, content };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error({ error: message }, 'Failed to create wiki page');
    throw error;
  }
}

export async function listPRs(owner: string, repo: string) {
  const log = logger.child({ action: 'listPRs', owner, repo });
  log.info('Attempting to list pull requests');

  try {
    const response = await getOctokit().pulls.list({
      owner,
      repo,
    });
    log.info('Successfully listed pull requests');
    return response.data;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error({ error: message }, 'Failed to list pull requests');
    throw error;
  }
}

export async function getRepo(owner: string, repo: string) {
  const log = logger.child({ action: 'getRepo', owner, repo });
  log.info('Attempting to get repository');

  try {
    const response = await getOctokit().repos.get({
      owner,
      repo,
    });
    log.info('Successfully got repository');
    return response.data;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error({ error: message }, 'Failed to get repository');
    throw error;
  }
}
