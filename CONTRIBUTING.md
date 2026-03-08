# Contributing

## Development Setup

```sh
npm install
npm run lint
npm run build
npm run mcaddon
```

## Pull Requests

- keep changes focused and explain the gameplay or tooling impact clearly
- include any Bedrock-specific assumptions in the PR description
- update documentation when pack structure, install steps, or release behavior changes
- run `npm run lint` and `npm run mcaddon` before opening a PR

## Bedrock Testing

For gameplay changes, verify at least:

- the pack loads without content log errors
- the block can be placed and broken
- the resource pack renders correctly on clients
- world generation works in newly generated chunks only

## Release Flow

- update `package.json` version
- update `CHANGELOG.md`
- merge to `main`
- create and push a matching tag such as `v0.1.0`

