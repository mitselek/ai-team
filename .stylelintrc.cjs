// Tailwind-aware Stylelint configuration
// Keeps @tailwind directives valid without blanket disable comments
module.exports = {
  extends: [
    'stylelint-config-standard'
  ],
  rules: {
    // Allow Tailwind and common utility at-rules
    'at-rule-no-unknown': [true, {
      ignoreAtRules: ['tailwind', 'apply', 'variants', 'responsive', 'screen']
    }],
    // Example: enforce a max nesting depth for maintainability
    'max-nesting-depth': [3, { ignore: ['pseudo-classes'] }],
    // Let Tailwind handle declaration order
    'declaration-block-single-line-max-declarations': 4
  },
  overrides: [
    {
      files: ['**/*.vue'],
      customSyntax: 'postcss-html'
    }
  ],
  ignoreFiles: [
    '**/*.ts',
    '**/*.js',
    '**/*.json'
  ]
}
