// @ts-check

import globals from "globals";
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    "files": ["**/*.ts"],
    "languageOptions": { globals: globals.browser },
    "rules": {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          "args": "all",
          "argsIgnorePattern": "^_",
          "caughtErrors": "all",
          "caughtErrorsIgnorePattern": "^_",
          "destructuredArrayIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "ignoreRestSiblings": true
        }
      ],
      "no-empty-function": "off",
      "@typescript-eslint/no-empty-function": "off",
    },
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
);
