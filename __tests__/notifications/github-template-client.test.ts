import {
  DEFAULT_GITHUB_API_BASE_URL,
  getGitHubTemplatePreviewConfigFromEnv,
} from '@/lib/notifications/github-template-preview-config';
import { GitHubTemplateClient } from '@/lib/notifications/github-template-client';

describe('GitHubTemplateClient', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('builds config from env using defaults when optional vars are missing', () => {
    process.env.GITHUB_REPO = 'vintasoftware/vintasend-ts';
    process.env.GITHUB_API_KEY = 'token';
    delete process.env.GITHUB_API_BASE_URL;

    const config = getGitHubTemplatePreviewConfigFromEnv();

    expect(config.repo).toBe('vintasoftware/vintasend-ts');
    expect(config.apiKey).toBe('token');
    expect(config.apiBaseUrl).toBe(DEFAULT_GITHUB_API_BASE_URL);
  });

  it('normalizes full GitHub repository URL from env to owner/repo', () => {
    process.env.GITHUB_REPO = 'https://github.com/vintasoftware/vintasend-medplum-example';
    process.env.GITHUB_API_KEY = 'token';

    const config = getGitHubTemplatePreviewConfigFromEnv();

    expect(config.repo).toBe('vintasoftware/vintasend-medplum-example');
  });

  it('fetches file content using ref=<gitCommitSha> in URL', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: Buffer.from('hello world').toString('base64'),
        encoding: 'base64',
      }),
    });

    const client = new GitHubTemplateClient(
      {
        repo: 'vintasoftware/vintasend-ts',
        apiKey: 'token',
        apiBaseUrl: 'https://api.github.com',
        templatesBasePath: 'src/templates',
      },
      fetchMock as unknown as typeof fetch,
    );

    await client.getTemplateContentByCommit({
      templatePath: 'emails/welcome.pug',
      gitCommitSha: 'a'.repeat(40),
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = fetchMock.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain(
      '/repos/vintasoftware/vintasend-ts/contents/src/templates/emails/welcome.pug?ref=',
    );
    expect(calledUrl).toContain('a'.repeat(40));
  });

  it('returns deterministic safe error for not-found responses', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers(),
      json: async () => ({ message: 'Not Found' }),
    });

    const client = new GitHubTemplateClient(
      {
        repo: 'vintasoftware/vintasend-ts',
        apiKey: 'token',
        apiBaseUrl: 'https://api.github.com',
      },
      fetchMock as unknown as typeof fetch,
    );

    await expect(
      client.getTemplateContentByCommit({
        templatePath: 'templates/missing.pug',
        gitCommitSha: 'b'.repeat(40),
      }),
    ).rejects.toThrow('Template file was not found in GitHub for the requested commit.');
  });

  it('returns deterministic safe error for rate-limit responses', async () => {
    const headers = new Headers();
    headers.set('x-ratelimit-remaining', '0');

    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers,
      json: async () => ({ message: 'API rate limit exceeded' }),
    });

    const client = new GitHubTemplateClient(
      {
        repo: 'vintasoftware/vintasend-ts',
        apiKey: 'token',
        apiBaseUrl: 'https://api.github.com',
      },
      fetchMock as unknown as typeof fetch,
    );

    await expect(
      client.getTemplateContentByCommit({
        templatePath: 'templates/welcome.pug',
        gitCommitSha: 'c'.repeat(40),
      }),
    ).rejects.toThrow('GitHub API rate limit exceeded while fetching template preview.');
  });

  it('returns cached content for repeated repo:path:sha requests', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: Buffer.from('cached-value').toString('base64'),
        encoding: 'base64',
      }),
    });

    const client = new GitHubTemplateClient(
      {
        repo: 'vintasoftware/vintasend-ts',
        apiKey: 'token',
        apiBaseUrl: 'https://api.github.com',
      },
      fetchMock as unknown as typeof fetch,
      { cacheMaxEntries: 10 },
    );

    const request = {
      templatePath: 'templates/welcome.pug',
      gitCommitSha: 'd'.repeat(40),
    };

    const first = await client.getTemplateContentByCommit(request);
    const second = await client.getTemplateContentByCommit(request);

    expect(first).toBe('cached-value');
    expect(second).toBe('cached-value');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('logs resolved lookup path before requesting GitHub content', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: Buffer.from('hello world').toString('base64'),
        encoding: 'base64',
      }),
    });

    const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);

    const client = new GitHubTemplateClient(
      {
        repo: 'vintasoftware/vintasend-ts',
        apiKey: 'token',
        apiBaseUrl: 'https://api.github.com',
        templatesBasePath: 'src/templates',
      },
      fetchMock as unknown as typeof fetch,
    );

    await client.getTemplateContentByCommit({
      templatePath: 'emails/welcome.pug',
      gitCommitSha: 'e'.repeat(40),
    });

    expect(consoleInfoSpy).toHaveBeenCalledWith('GitHub template preview lookup:', {
      repo: 'vintasoftware/vintasend-ts',
      gitCommitSha: 'e'.repeat(40),
      templatePath: 'emails/welcome.pug',
      resolvedPath: 'src/templates/emails/welcome.pug',
    });

    consoleInfoSpy.mockRestore();
  });
});
