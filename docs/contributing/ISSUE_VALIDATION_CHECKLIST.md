# Contributor Issue Validation Checklist

Before opening a pull request, please review the following validation checklist to ensure your contribution meets our quality standards. This helps reduce review cycles and ensures smooth integration.

## 🖥 Dashboard UI Issues

- [ ] **Visual Verification**: Have you verified the changes in the browser? (e.g., `pnpm dev`)
- [ ] **Screenshots/Videos**: If your PR introduces visual changes, have you included screenshots or a short screen recording in the PR description?
- [ ] **Responsive Design**: Have you tested the UI on both desktop and mobile viewports?
- [ ] **Accessibility**: Do the new elements meet basic accessibility guidelines (e.g., ARIA labels, contrast, keyboard navigation)?
- [ ] **Console Errors**: Are there any new errors or warnings in the browser console?

## 🛠 SDK Utility Issues

- [ ] **Unit Tests**: Have you added or updated unit tests for the new or modified SDK functions?
- [ ] **Type Definitions**: Are TypeScript types correct and strict? No `any` types used unless absolutely necessary?
- [ ] **Edge Cases**: Have you considered and handled potential edge cases or failure modes (e.g., network errors, invalid inputs)?
- [ ] **Local Testing**: Have you run `pnpm test` and ensured all tests pass?

## 📜 Contract Test or Docs Issues

- [ ] **Test Coverage**: Do the contract tests cover the intended behavior completely?
- [ ] **Documentation Accuracy**: Are the documentation changes accurate and clearly written?
- [ ] **Formatting**: Do code snippets in docs follow the standard formatting?
- [ ] **Local Execution**: Do all contract tests pass against a local Soroban node or testnet?

## 🔄 General Reminders (All PRs)

- [ ] **CI Checks**: Ensure all Continuous Integration (CI) checks (linting, tests) pass on your branch before requesting a review.
- [ ] **Merge Conflicts**: Resolve any merge conflicts with the `main` branch prior to opening the PR. Keep your branch up to date.
- [ ] **Formatting & Linting**: Run `pnpm lint` and resolve any formatting or linting errors.
- [ ] **Commit Messages**: Use clear and descriptive commit messages.
