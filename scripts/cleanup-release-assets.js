/**
 * cleanup-release-assets.js
 *
 * Automated maintenance script to inspect all GitHub releases in the repository
 * and delete redundant assets (such as NotiCatch-latest.apk or uploaded .zip files),
 * guaranteeing that each release contains ONLY its dedicated versioned .apk file.
 */

const https = require('https');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY || 'kush1310/DeletedMsgReader';

if (!GITHUB_TOKEN) {
  console.error('ERROR: GITHUB_TOKEN environment variable is required.');
  process.exit(1);
}

function apiRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        'User-Agent': 'NotiCatch-Release-Cleaner',
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    };

    const req = https.request(options, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(body ? JSON.parse(body) : null);
          } catch {
            resolve(body);
          }
        } else {
          reject(new Error(`API Error ${res.statusCode} on ${method} ${path}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function runCleanup() {
  console.log(`Inspecting releases for repository: ${REPO}...`);
  const releases = await apiRequest(`/repos/${REPO}/releases?per_page=100`);

  if (!Array.isArray(releases)) {
    console.error('Failed to retrieve releases list:', releases);
    return;
  }

  console.log(`Found ${releases.length} releases.`);

  for (const release of releases) {
    const tagName = release.tag_name;
    const expectedApkName = `NotiCatch-${tagName}.apk`;
    console.log(`\nEvaluating release: ${tagName} (ID: ${release.id})...`);

    if (!release.assets || release.assets.length === 0) {
      console.log(`  - No custom uploaded binary assets found.`);
      continue;
    }

    for (const asset of release.assets) {
      const assetName = asset.name;
      const assetId = asset.id;

      // Unwanted asset conditions:
      // 1. 'NotiCatch-latest.apk'
      // 2. Any uploaded '.zip' file
      // 3. Any duplicate or non-versioned asset when versioned asset exists
      const isRedundantLatest = assetName === 'NotiCatch-latest.apk';
      const isZipArchive = assetName.endsWith('.zip');
      const isMismatched = assetName !== expectedApkName && release.assets.some(a => a.name === expectedApkName);

      if (isRedundantLatest || isZipArchive || isMismatched) {
        console.log(`  → Deleting redundant asset: "${assetName}" (ID: ${assetId})...`);
        try {
          await apiRequest(`/repos/${REPO}/releases/assets/${assetId}`, 'DELETE');
          console.log(`  √ Successfully deleted "${assetName}".`);
        } catch (err) {
          console.error(`  × Failed to delete "${assetName}":`, err.message);
        }
      } else {
        console.log(`  √ Preserving dedicated asset: "${assetName}" (ID: ${assetId}).`);
      }
    }
  }

  console.log('\nRelease assets cleanup completed successfully.');
}

runCleanup().catch(err => {
  console.error('Fatal cleanup error:', err);
  process.exit(1);
});
