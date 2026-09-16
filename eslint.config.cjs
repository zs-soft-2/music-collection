const nx = require('@nx/eslint-plugin');

module.exports = [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?js$'],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {},
  },
  {
    files: ['**/*.html'],
    rules: {
      // A PrimeNG pButton a label attribútumból rendereli a gomb szövegét
      // (<span class="p-button-label">), tehát az akadálymentes név megvan —
      // a szabály alapértelmezett listája viszont nem ismeri a label-t.
      '@angular-eslint/template/elements-content': [
        'error',
        {
          allowList: [
            'aria-label',
            'innerHtml',
            'innerHTML',
            'innerText',
            'outerHTML',
            'textContent',
            'title',
            'label',
          ],
        },
      ],
    },
  },
];
