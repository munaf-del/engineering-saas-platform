import path from 'node:path';

const workspaceRoots = ['apps/web', 'apps/api', 'packages/shared'];
const repoRoot = process.cwd();

const quote = (value) => JSON.stringify(value);
const absolutePath = (file) => (path.isAbsolute(file) ? file : path.join(repoRoot, file));

const relativeFilesForWorkspace = (files, workspaceRoot) =>
  files
    .map((file) => path.relative(path.join(repoRoot, workspaceRoot), absolutePath(file)))
    .filter((file) => file && !file.startsWith('..') && !path.isAbsolute(file));

const eslintByWorkspace = (files) =>
  workspaceRoots.flatMap((workspaceRoot) => {
    const workspaceFiles = relativeFilesForWorkspace(files, workspaceRoot);

    if (workspaceFiles.length === 0) {
      return [];
    }

    return `pnpm --dir ${quote(workspaceRoot)} exec eslint --fix ${workspaceFiles
      .map(quote)
      .join(' ')}`;
  });

export default {
  '*.{ts,tsx,js,jsx}': (files) => [
    `prettier --write ${files.map(quote).join(' ')}`,
    ...eslintByWorkspace(files),
  ],
  '*.{json,md,css}': (files) => `prettier --write ${files.map(quote).join(' ')}`,
  '*.py': (files) => [
    `ruff format ${files.map(quote).join(' ')}`,
    `ruff check --fix ${files.map(quote).join(' ')}`,
  ],
};
