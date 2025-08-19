module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  extends: 'eslint:recommended',
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': 'off',
    'semi': ['error', 'always'],
    'quotes': ['error', 'single', { allowTemplateLiterals: true }],
    'indent': ['error', 4, { SwitchCase: 1 }],
    'comma-dangle': ['error', 'never']
  }
};