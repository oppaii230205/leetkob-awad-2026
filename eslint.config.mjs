import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["node_modules/**", "data/**", "tmp/**", "output/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ["**/*.ts"], rules: { "no-undef": "off" } },
);
