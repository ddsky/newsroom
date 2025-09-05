#!/usr/bin/env node
/**
 * Build Windows and Linux installers from a Windows machine.
 * Note: macOS builds must be created on macOS due to Apple tooling requirements.
 */
const { spawnSync } = require('child_process');

function run(cmd, args) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: true });
  if (res.status !== 0) {
    process.exit(res.status || 1);
  }
}

console.log('Building Windows installer...');
run('npm', ['run', 'dist:win']);

console.log('Building Linux AppImage...');
run('npm', ['run', 'dist:linux']);

console.log('\nAll done. Artifacts are in the dist/ folder.');
