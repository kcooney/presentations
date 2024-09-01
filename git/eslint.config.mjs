import globals from "globals";
import pluginJs from "@eslint/js";


export default [
  {
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: {
          impliedStrict: true
        }
      }
    }
  },
  pluginJs.configs.recommended,
];