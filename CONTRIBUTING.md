# Contributing to OLI SDK

Thank you for your interest in contributing to the Open Labels Initiative SDK! 🎉

## Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/openlabelsinitiative/oli-sdk.git
   cd oli-sdk
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the SDK**
   ```bash
   npm run build
   ```

## Project Structure

```
oli-sdk/
├── src/
│   ├── index.ts           # Package entry point
│   ├── client.ts          # Main OLI client
│   ├── rest.ts            # REST API surface + helpers
│   ├── fetcher.ts         # Tag/value-set + export fetcher
│   ├── helpers.ts         # Display + label utility helpers
│   ├── proxy.ts           # API key proxy middleware
│   ├── validation.ts      # Zod schemas for runtime validation
│   └── types/             # TypeScript type definitions
├── docs/                  # Supplemental references
├── tests/                 # Integration tests
├── dist/                  # Build output (generated)
└── package.json
```

## Development Guidelines

### Code Style

- Use TypeScript for all code
- Follow existing code formatting
- Add JSDoc comments for public APIs
- Use meaningful variable and function names

### Type Safety

- Avoid using `any` unless absolutely necessary
- Prefer `unknown` over `any` when type is uncertain
- Use type guards for runtime type checking
- Keep types flexible to support dynamic data from GitHub

### Key Design Principles

1. **Dynamic Types**: Types and value sets are fetched at runtime from GitHub
2. **No Hardcoding**: Avoid hardcoding enum values or tag definitions
3. **Browser Compatible**: Code must work in both Node.js and browsers
4. **Minimal Dependencies**: Keep dependencies to a minimum
5. **Type Safety**: Full TypeScript support with comprehensive types

### Adding New Features

1. **Create a new branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Implement your feature**
   - Add types in `src/types/` if needed
   - Implement functionality in appropriate module
   - Update exports in `src/index.ts`
   - Add JSDoc comments

3. **Add examples**
   - Create example in `examples/` directory
   - Update `examples/README.md` if needed

4. **Update documentation**
   - Update main `README.md` with new features
   - Update `CHANGELOG.md` with changes
   - Add code examples for new APIs

5. **Test your changes**
   - Run the build: `npm run build`
   - Test with examples: `cd examples && npm run basic`
   - Manually test in a real project if possible

6. **Submit a pull request**
   - Provide clear description of changes
   - Link to any related issues
   - Ensure all checks pass

## Testing

Currently, the SDK uses manual testing with examples. We welcome contributions for:
- Unit tests setup
- Integration tests
- End-to-end tests

## Common Tasks

### Adding a New Method

1. Add method to the appropriate module (`DataFetcher`, `RestClient`, helpers, or `OLIClient`)
2. Add JSDoc comments explaining usage
3. Export any new types in `src/index.ts`
4. Add example usage in `README.md`

### Adding a New Type

1. Add type definition in `src/types/` appropriate file
2. Export type in `src/index.ts`
3. Document type in README if user-facing

## Questions?

Feel free to:
- Open an issue for questions or discussions
- Join our community channels
- Reach out to maintainers

## Commit Messages

All pull requests must use **Conventional Commits** format:

```
<type>(<scope>): <short summary>
```

Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`

Examples:
```
feat(attest): add validateAddressForChain to /validation subpath
fix(uiHooks): correct isRunning flag reset after validation error
docs(contributing): add Conventional Commits guidance
```

Breaking changes must include a `BREAKING CHANGE:` footer or a `!` after the type:
```
feat(attest-ui)!: restructure hook return shape into namespaced sub-objects
```

The `CHANGELOG.md` is maintained manually — update the `[Unreleased]` section as part of your PR.

## Releases

Publishing steps live in [`docs/RELEASING.md`](docs/RELEASING.md). Follow that checklist whenever you cut a new version (including deprecating `0.1.1` in favour of the refreshed `0.1.0` baseline).

## Code of Conduct

Be respectful and constructive in all interactions. We're building this together! 🤝

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
