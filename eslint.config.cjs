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
            // Két független irány. A `platform:` azt mondja meg, mire
            // támaszkodhat egy library (a `platform:agnostic` libek a Cloud
            // Functionsben is futnak, ezért nem láthatnak keretrendszert), a
            // `type:` pedig a rétegek irányát: app → admin → domain → ui →
            // api, mellette core → api, és később engine → api.
            {
              sourceTag: 'platform:agnostic',
              onlyDependOnLibsWithTags: ['platform:agnostic'],
              bannedExternalImports: [
                '@angular/*',
                '@ngrx/*',
                'primeng',
                'primeng/*',
                '@primeuix/*',
                '@primeicons/*',
                'ng-flex-layout',
                'ngx-permissions',
                'firebase',
              ],
            },
            {
              sourceTag: 'type:api',
              onlyDependOnLibsWithTags: ['type:api'],
            },
            {
              sourceTag: 'type:engine',
              onlyDependOnLibsWithTags: ['type:api', 'type:engine'],
            },
            {
              sourceTag: 'type:ui',
              onlyDependOnLibsWithTags: ['type:api', 'type:engine', 'type:ui'],
            },
            {
              sourceTag: 'type:core',
              onlyDependOnLibsWithTags: [
                'type:api',
                'type:engine',
                'type:core',
              ],
            },
            // A domain librarykben PrimeNG-tábla-komponensek is vannak, ezért
            // láthatják a ui libraryt; visszafelé tilos.
            {
              sourceTag: 'type:domain',
              onlyDependOnLibsWithTags: [
                'type:api',
                'type:engine',
                'type:ui',
                'type:domain',
              ],
            },
            {
              sourceTag: 'type:admin',
              onlyDependOnLibsWithTags: [
                'type:api',
                'type:engine',
                'type:ui',
                'type:domain',
                'type:admin',
              ],
            },
            {
              sourceTag: 'type:app',
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
