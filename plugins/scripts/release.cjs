#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get version type from command line args
const versionType = process.argv[2];

if (!['patch', 'minor', 'major'].includes(versionType)) {
  console.error('Usage: node release.cjs [patch|minor|major]');
  process.exit(1);
}

try {
  console.log(`\n Starting ${versionType} release...\n`);

  // Check if working directory is clean
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim()) {
      console.error(' Working directory is not clean. Please commit or stash changes first.');
      process.exit(1);
    }
  } catch (error) {
    console.error(' Failed to check git status:', error.message);
    process.exit(1);
  }

  // Get current branch
  const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  console.log(` Current branch: ${branch}`);

  // Bump version
  console.log(`\n Bumping ${versionType} version...`);
  execSync(`npm version ${versionType} --no-git-tag-version`, { stdio: 'inherit' });

  // Read new version
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  const newVersion = packageJson.version;
  const tag = `v${newVersion}`;

  console.log(`\n New version: ${newVersion}`);

  // Commit the version change
  console.log('\n Committing version change...');
  execSync('git add package.json package-lock.json', { stdio: 'inherit' });
  execSync(`git commit -m "chore(release): bump version to ${newVersion}"`, { stdio: 'inherit' });

  // Create and push tag
  console.log(`\n  Creating tag ${tag}...`);
  execSync(`git tag ${tag}`, { stdio: 'inherit' });

  // Push changes and tag
  console.log(`\n⬆  Pushing changes to origin/${branch}...`);
  execSync(`git push origin ${branch}`, { stdio: 'inherit' });
  
  console.log(`\n⬆  Pushing tag ${tag}...`);
  execSync(`git push origin ${tag}`, { stdio: 'inherit' });

  console.log(`\n Release ${tag} completed successfully!`);
  console.log(`\n GitHub Actions will now build and publish to npm.`);
  console.log(`\n Check progress at: https://github.com/zachorg/EzStack/actions\n`);

} catch (error) {
  console.error('\n Release failed:', error.message);
  process.exit(1);
}

