// Staged files are formatted, and code files are then linted with their own area's configuration.
// Formatting and linting run in sequence per file type, so they never touch a file at the same time.
const quote = (files) => files.map((file) => `"${file}"`).join(' ');

export default {
  'client/**/*.{js,ts,tsx}': (files) => [
    `prettier --write ${quote(files)}`,
    `npm --prefix client exec -- eslint --no-warn-ignored ${quote(files)}`,
  ],
  'server/**/*.{js,ts}': (files) => [
    `prettier --write ${quote(files)}`,
    `npm --prefix server exec -- eslint --no-warn-ignored ${quote(files)}`,
  ],
  '**/*.{mjs,cjs,json,md,css,html,yml,yaml}': (files) => `prettier --write ${quote(files)}`,
};
