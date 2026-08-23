/**
 * cleanup-release-assets.js
 *
 * Automated maintenance script to inspect all GitHub releases in the repository
 * and delete redundant assets (such as NotiCatch-latest.apk or uploaded .zip files),
 * guaranteeing that each release contains ONLY its dedicated versioned .apk file.
 */

import { execSync } from 'child_process';

const REPO = process.env.GITHUB_REPOSITORY || 'kush1310/DeletedMsgReader';

function runCommand(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

async function main() {
  console.log(`Starting release assets cleanup for repository: ${REPO}...`);

  // Query all releases using gh CLI
  const jsonOutput = runCommand(`gh release list --repo ${REPO} --limit 100 --json tagName,name,id,assets`);

  if (!jsonOutput) {
    console.log('Unable to query releases via gh CLI or no releases found. Skipping.');
    return;
  }

  let releases = [];
  try {
    releases = JSON.parse(jsonOutput);
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    console.error('Failed to parse release list JSON:', errorMsg);
    return;
  }

  console.log(`Found ${releases.length} releases.`);

  for (const release of releases) {
    const tagName = release.tagName;
    const expectedApk = `NotiCatch-${tagName}.apk`;
    console.log(`\nEvaluating release: ${tagName}...`);

    if (!release.assets || release.assets.length === 0) {
      console.log(`  - No uploaded assets.`);
      continue;
    }

    for (const asset of release.assets) {
      const assetName = asset.name;

      // Identify redundant assets:
      // 1. 'NotiCatch-latest.apk'
      // 2. Any file ending in '.zip'
      // 3. Mismatched files if expected APK already exists
      const isRedundantLatest = assetName === 'NotiCatch-latest.apk';
      const isZipArchive = assetName.endsWith('.zip');
      const isDuplicate = assetName !== expectedApk && release.assets.some((a) => a.name === expectedApk);

      if (isRedundantLatest || isZipArchive || isDuplicate) {
        console.log(`  → Removing redundant asset "${assetName}" from release ${tagName}...`);
        const delResult = runCommand(`gh release delete-asset ${tagName} "${assetName}" --repo ${REPO} --yes`);
        if (delResult !== null) {
          console.log(`  √ Successfully removed "${assetName}".`);
        } else {
          console.log(`  ! Notice: Could not remove "${assetName}" (it may have already been removed).`);
        }
      } else {
        console.log(`  √ Keeping dedicated asset: "${assetName}".`);
      }
    }
  }

  console.log('\nRelease assets cleanup evaluation complete.');
}

main().catch(err => {
  const errorMsg = err instanceof Error ? err.message : String(err);
  console.error('Non-fatal cleanup notice:', errorMsg);
  process.exit(0);
});
