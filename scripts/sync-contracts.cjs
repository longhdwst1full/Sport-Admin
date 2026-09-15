const { existsSync } = require('node:fs');
const { mkdir, readFile, writeFile } = require('node:fs/promises');
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
  'checkout',
  'orders',
  'payments',
  'fulfillments',
  'promotions',
  'reporting',
];
const defaultBaseUrl =
  'https://raw.githubusercontent.com/longhdwst1full/dctd-utc/main/document/api/admin';
const baseUrl = (process.env.SPORT_API_CONTRACT_BASE_URL || defaultBaseUrl).replace(/\/$/, '');
const siblingContractDirectory = resolve(__dirname, '../../api/document/api/admin');
const contractDirectory = process.env.SPORT_API_CONTRACT_DIR
  ? resolve(process.env.SPORT_API_CONTRACT_DIR)
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

  await mkdir(outputDirectory, { recursive: true });
  await Promise.all(
    contracts.map(({ domain, content }) =>
      writeFile(resolve(outputDirectory, `${domain}.yaml`), content, 'utf8'),
    ),
  );
  console.log(`Synced ${contracts.length} Admin API contracts from ${contractDirectory ?? baseUrl}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
