/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // New feature
        'fix', // Bug fix
        'docs', // Documentation only
        'style', // Formatting, missing semicolons, etc.
        'refactor', // Code change that neither fixes a bug nor adds a feature
        'perf', // Performance improvement
        'test', // Adding missing tests
        'chore', // Maintenance tasks
        'ci', // CI/CD changes
        'build', // Build system or external dependencies
        'revert', // Revert a previous commit
      ],
    ],
    'scope-enum': [
      2,
      'always',
      [
        // Apps
        'mobile',
        'web',
        'admin',

        // Services
        'auth',
        'user',
        'kyc',
        'transfer',
        'wallet',
        'ledger',
        'fx',
        'claim',
        'offramp',
        'notify',

        // Packages
        'types',
        'utils',
        'config',
        'ui',
        'events',
        'database',
        'api-client',

        // Infrastructure
        'infra',
        'k8s',
        'helm',
        'docker',
        'ci',

        // Root level
        'deps',
        'release',
      ],
    ],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 100],
  },
};
