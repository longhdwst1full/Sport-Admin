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
];
const defaultBaseUrl =
  'https://raw.githubusercontent.com/longhdwst1full/dctd-utc/main/document/api/admin';
const baseUrl = (process.env.SPORT_API_CONTRACT_BASE_URL || defaultBaseUrl).replace(/\/$/, '');
const siblingContractDirectory = resolve(__dirname, '../../api/document/api/admin');
// CONTRACTS_SOURCE_DIR overrides the source dir (e.g. an api worktree that has the
// contract ahead of the api main checkout); SPORT_API_CONTRACT_DIR kept as legacy alias.
const overrideContractDirectory = process.env.CONTRACTS_SOURCE_DIR || process.env.SPORT_API_CONTRACT_DIR;
const contractDirectory = overrideContractDirectory
  ? resolve(overrideContractDirectory)
  : (existsSync(siblingContractDirectory) ? siblingContractDirectory : undefined);
const outputDirectory = resolve(__dirname, '../contracts/admin');

async function main() {
  const contracts = await Promise.all(
    domains.map(async (domain) => {
      const content = contractDirectory
        ? await readFile(resolve(contractDirectory, `${domain}.yaml`), 'utf8')
        : await fetch(`${baseUrl}/${domain}.yaml`).then(async (response) => {
            if (!response.ok) throw new Error(`Cannot download ${domain}.yaml: HTTP ${response.status}`);
            return response.text();
          });
      if (!/^openapi:\s*3\./m.test(content)) {
        throw new Error(`${domain}.yaml is not an OpenAPI 3 contract`);
      }
      return { domain, content };
    }),
  );

  // Shared `_*.yaml` files (e.g. `_components.yaml`) are referenced by domain slices via
  // relative `$ref` and must sit alongside them in contracts/admin for those refs to resolve.
  let sharedFiles = [];
  if (contractDirectory) {
    const entries = await readdir(contractDirectory);
    sharedFiles = await Promise.all(
      entries
        .filter((name) => name.startsWith('_') && name.endsWith('.yaml'))
        .map(async (name) => ({ name, content: await readFile(resolve(contractDirectory, name), 'utf8') })),
    );
  }

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
