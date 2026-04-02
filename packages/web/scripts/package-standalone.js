const path = require('node:path');
const fs = require('node:fs/promises');
const { spawnSync } = require('node:child_process');

function parseArgs(argv) {
  const args = { outDir: 'dist-standalone', archive: 'tgz' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out' || arg === '-o') {
      args.outDir = argv[i + 1] || args.outDir;
      i += 1;
      continue;
    }
    if (arg === '--no-archive') {
      args.archive = 'none';
      continue;
    }
    if (arg === '--tgz') {
      args.archive = 'tgz';
      continue;
    }
    if (arg === '--zip') {
      args.archive = 'zip';
      continue;
    }
  }
  return args;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatTimestamp(date) {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  const hh = pad2(date.getHours());
  const mm = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());
  return `${y}${m}${d}_${hh}${mm}${ss}`;
}

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function findAppServerEntry(standaloneDir) {
  const directCandidates = [
    path.join(standaloneDir, 'server.js'),
    path.join(standaloneDir, 'packages', 'web', 'server.js'),
  ];

  for (const candidate of directCandidates) {
    if (await pathExists(candidate)) return candidate;
  }

  const entries = await fs.readdir(standaloneDir, { withFileTypes: true });
  const roots = entries.filter((e) => e.isDirectory() && e.name !== 'node_modules').map((e) => path.join(standaloneDir, e.name));

  async function walk(dir) {
    const children = await fs.readdir(dir, { withFileTypes: true });

    const hits = children
      .filter((c) => c.isFile() && c.name === 'server.js')
      .map((c) => path.join(dir, c.name));

    const preferred = hits.find((p) => p.includes(`${path.sep}packages${path.sep}web${path.sep}server.js`));
    if (preferred) return preferred;

    const nonNodeHits = hits.find((p) => !p.includes(`${path.sep}node_modules${path.sep}`));
    if (nonNodeHits) return nonNodeHits;

    for (const child of children) {
      if (!child.isDirectory()) continue;
      if (child.name === 'node_modules') continue;
      const found = await walk(path.join(dir, child.name));
      if (found) return found;
    }

    return '';
  }

  for (const root of roots) {
    const found = await walk(root);
    if (found) return found;
  }

  return '';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const webDir = path.resolve(__dirname, '..');
  const standaloneDir = path.join(webDir, '.next', 'standalone');
  const staticDir = path.join(webDir, '.next', 'static');
  const publicDir = path.join(webDir, 'public');

  const serverEntry = await findAppServerEntry(standaloneDir);

  if (!serverEntry) {
    throw new Error(`standalone 产物不完整：${standaloneDir}。请先在 packages/web 运行 next build（建议使用 --webpack）。`);
  }

  const outRoot = path.resolve(webDir, args.outDir);
  const bundleName = `doubao-web-standalone_${formatTimestamp(new Date())}`;
  const stageDir = path.join(outRoot, bundleName);

  await fs.rm(outRoot, { recursive: true, force: true });
  await fs.mkdir(outRoot, { recursive: true });

  await fs.cp(standaloneDir, stageDir, { recursive: true });

  const appRootRel = path.relative(standaloneDir, path.dirname(serverEntry));
  const stageAppDir = path.join(stageDir, appRootRel);
  const stageNextDir = path.join(stageAppDir, '.next');
  await fs.mkdir(stageNextDir, { recursive: true });

  if (await pathExists(staticDir)) {
    await fs.cp(staticDir, path.join(stageNextDir, 'static'), { recursive: true });
  }

  if (await pathExists(publicDir)) {
    await fs.cp(publicDir, path.join(stageAppDir, 'public'), { recursive: true });
  }

  if (args.archive === 'none') {
    process.stdout.write(`${stageDir}\n`);
    return;
  }

  if (args.archive === 'tgz') {
    const archivePath = path.join(outRoot, `${bundleName}.tgz`);
    const result = spawnSync('tar', ['-czf', archivePath, bundleName], { cwd: outRoot, stdio: 'inherit' });
    if (result.status !== 0) {
      throw new Error(`tar 打包失败：${archivePath}`);
    }
    process.stdout.write(`${archivePath}\n`);
    return;
  }

  if (args.archive === 'zip') {
    const archivePath = path.join(outRoot, `${bundleName}.zip`);

    if (process.platform === 'win32') {
      const ps = [
        'Compress-Archive',
        '-Path',
        `"${stageDir}\\*"`,
        '-DestinationPath',
        `"${archivePath}"`,
        '-Force',
      ].join(' ');
      const psResult = spawnSync('powershell.exe', ['-NoProfile', '-Command', ps], { cwd: outRoot, stdio: 'inherit' });
      if (psResult.status === 0) {
        process.stdout.write(`${archivePath}\n`);
        return;
      }

      const tarResult = spawnSync('tar', ['-a', '-cf', archivePath, bundleName], { cwd: outRoot, stdio: 'inherit' });
      if (tarResult.status !== 0) {
        throw new Error(`zip 打包失败：${archivePath}`);
      }
      process.stdout.write(`${archivePath}\n`);
      return;
    }

    const zipResult = spawnSync('zip', ['-r', archivePath, bundleName], { cwd: outRoot, stdio: 'inherit' });
    if (zipResult.status !== 0) {
      throw new Error(`zip 打包失败：${archivePath}（需要系统安装 zip 命令，或改用 --tgz）`);
    }
    process.stdout.write(`${archivePath}\n`);
    return;
  }

  throw new Error(`未知 archive 类型：${args.archive}`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
