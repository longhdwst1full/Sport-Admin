const { existsSync } = require('node:fs');
const { mkdir, readdir, readFile, writeFile } = require('node:fs/promises');
const { resolve } = require('node:path');

const domains = [
  'auth',
  'organization',
  'iam',
  'audit',
  'catalog',
  'inventory',
  'content',
  'reviews',
  'media',
  'system',
  'notifications',
  'checkout',
  'customers',
  'orders',
  'payments',
  'fulfillments',
  'returns',
  'promotions',
  'reporting',
  'shipping',
  'support',
  'assistant',
  'procurement',
];
const defaultBaseUrl =
  'https://raw.githubusercontent.com/longhdwst1full/Sport-api-doc/main/document/api/admin';
const baseUrl = (process.env.SPORT_API_CONTRACT_BASE_URL || defaultBaseUrl).replace(/\/$/, '');
// Thư mục API nằm cạnh repo này: tên thật là `sport-api-doc`; `api` giữ lại cho checkout cũ.
const siblingContractDirectory = ['sport-api-doc', 'api']
  .map((repo) => resolve(__dirname, `../../${repo}/document/api/admin`))
  .find((candidate) => existsSync(candidate));
// CONTRACTS_SOURCE_DIR overrides the source dir (e.g. an api worktree that has the
// contract ahead of the api main checkout); SPORT_API_CONTRACT_DIR kept as legacy alias.
const overrideContractDirectory = process.env.CONTRACTS_SOURCE_DIR || process.env.SPORT_API_CONTRACT_DIR;
const contractDirectory = overrideContractDirectory
  ? resolve(overrideContractDirectory)
  : siblingContractDirectory;
const outputDirectory = resolve(__dirname, '../contracts/admin');

// Repo API là private: tải từ GitHub raw cần token (CONTRACTS_GITHUB_TOKEN, scope `repo` hoặc fine-grained
// Contents:read). Không có token thì dùng CONTRACTS_SOURCE_DIR hoặc checkout `sport-api-doc` cạnh repo này.
const githubToken = process.env.CONTRACTS_GITHUB_TOKEN;
// File dùng chung mà các slice tham chiếu bằng `$ref: ./_components.yaml#/...`; phải nằm cạnh slice.
const remoteSharedFiles = ['_components.yaml'];

async function download(name) {
  const response = await fetch(`${baseUrl}/${name}`, githubToken ? { headers: { Authorization: `token ${githubToken}` } } : undefined);
  if (!response.ok) {
    const hint = response.status === 404 && !githubToken
      ? ' — repo API là private: đặt CONTRACTS_GITHUB_TOKEN hoặc CONTRACTS_SOURCE_DIR (thư mục document/api/...)'
      : '';
    throw new Error(`Cannot download ${name}: HTTP ${response.status}${hint}`);
  }
  return response.text();
}

async function main() {
  const contracts = await Promise.all(
    domains.map(async (domain) => {
      const content = contractDirectory
        ? await readFile(resolve(contractDirectory, `${domain}.yaml`), 'utf8')
        : await download(`${domain}.yaml`);
      if (!/^openapi:\s*3\./m.test(content)) {
        throw new Error(`${domain}.yaml is not an OpenAPI 3 contract`);
      }
      return { domain, content };
    }),
  );

  // Shared `_*.yaml` files (e.g. `_components.yaml`) are referenced by domain slices via
  // relative `$ref` and must sit alongside them in contracts/admin for those refs to resolve.
  const sharedFiles = contractDirectory
    ? await Promise.all(
        (await readdir(contractDirectory))
          .filter((name) => name.startsWith('_') && name.endsWith('.yaml'))
          .map(async (name) => ({ name, content: await readFile(resolve(contractDirectory, name), 'utf8') })),
      )
    : await Promise.all(remoteSharedFiles.map(async (name) => ({ name, content: await download(name) })));

  await mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    ...contracts.map(({ domain, content }) =>
      writeFile(resolve(outputDirectory, `${domain}.yaml`), content, 'utf8'),
    ),
    ...sharedFiles.map(({ name, content }) => writeFile(resolve(outputDirectory, name), content, 'utf8')),
  ]);
  console.log(
    `Synced ${contracts.length} Admin API contracts${sharedFiles.length ? ` + ${sharedFiles.length} shared file(s)` : ''} from ${contractDirectory ?? baseUrl}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
