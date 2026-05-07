if (typeof self === 'undefined') {
  global.self = globalThis;
}

const { spawnSync } = require('child_process');
const result = spawnSync('npx', ['next', 'build', '--turbopack'], {
  stdio: 'inherit',
  cwd: __dirname,
});

process.exit(result.status);
