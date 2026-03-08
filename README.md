# Ivanluck Lucky Ore

[![CI](https://github.com/keithdoyle9/ivanluck-lucky-ore/actions/workflows/ci.yml/badge.svg)](https://github.com/keithdoyle9/ivanluck-lucky-ore/actions/workflows/ci.yml)
[![Release](https://github.com/keithdoyle9/ivanluck-lucky-ore/actions/workflows/release.yml/badge.svg)](https://github.com/keithdoyle9/ivanluck-lucky-ore/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](./LICENSE)

Ivanluck Lucky Ore is an open-source Minecraft Bedrock add-on that adds a naturally generated `ivanluck:lucky_ore` block. Mining it always rolls from a high-tier reward table and separately has a 20% chance to trigger a mild bad-luck side effect.

## Features

- Visible lucky ore block with a custom texture.
- Overworld generation in newly created chunks only.
- Weighted reward loot table for every lucky ore break.
- Mild bad-luck side effects:
  - poison plus slowness
  - one silverfish spawn
  - junk item drop
- Late-game crafting recipe for additional lucky ore.
- TypeScript-based Bedrock script logic.

## Requirements

- Node.js 22 or newer
- npm 10 or newer
- Minecraft Bedrock `26.1.x` or a compatible Bedrock Dedicated Server build

## Development

```sh
npm install
npm run lint
npm run build
npm run mcaddon
```

Build outputs:

- `dist/server/behavior_packs/ivanluck`
- `dist/server/resource_packs/ivanluck`
- `dist/packages/ivanluck.mcaddon`

## Bedrock Dedicated Server Install

### 1. Find the active world folder

```sh
cd /path/to/bedrock-server
grep '^level-name=' server.properties
```

If that prints `level-name=My World`, the world folder is:

```text
/path/to/bedrock-server/worlds/My World
```

### 2. Copy the built packs into the world folder

Create the world-level pack folders if they do not already exist:

```sh
WORLD_NAME="$(grep '^level-name=' server.properties | cut -d= -f2-)"
mkdir -p worlds/"$WORLD_NAME"/behavior_packs
mkdir -p worlds/"$WORLD_NAME"/resource_packs
```

Copy the staged packs:

```sh
cp -R dist/server/behavior_packs/ivanluck worlds/"$WORLD_NAME"/behavior_packs/
cp -R dist/server/resource_packs/ivanluck worlds/"$WORLD_NAME"/resource_packs/
```

### 3. Enable the packs for the world

Create or update:

- `worlds/<level-name>/world_behavior_packs.json`
- `worlds/<level-name>/world_resource_packs.json`

If those files already contain other packs, append these objects instead of replacing the whole file.

`world_behavior_packs.json`

```json
[
  {
    "pack_id": "C33CEE03-8A8F-4DCB-BCE6-CA5452C41D6E",
    "version": [1, 0, 0]
  }
]
```

`world_resource_packs.json`

```json
[
  {
    "pack_id": "C27EA254-250B-4640-8E08-36F6195290BD",
    "version": [1, 0, 0]
  }
]
```

### 4. Require the resource pack on the server

In `server.properties`, set:

```text
texturepack-required=true
content-log-console-output-enabled=true
```

### 5. Restart the Bedrock server

Restart your actual server process or service after copying the updated packs.

## Optional Remote Deploy Helper

This repo includes a generic deploy script for Linux Bedrock Dedicated Server setups:

```sh
BEDROCK_HOST=root@example.com \
BEDROCK_SERVER_ROOT=/home/ubuntu/bedrock-server \
BEDROCK_RESTART=true \
npm run deploy:bedrock
```

Environment variables:

- `BEDROCK_HOST`: required SSH target such as `root@example.com`
- `BEDROCK_SERVER_ROOT`: optional, defaults to `/home/ubuntu/bedrock-server`
- `BEDROCK_SERVICE`: optional systemd service name, defaults to `bedrock`
- `BEDROCK_RESTART`: optional, set to `true` to restart the server after deploy

## Release Process

1. Update `package.json` to the target version.
2. Commit the change to `main`.
3. Create and push a semver tag such as `v0.1.0`.
4. GitHub Actions will build the add-on and publish a GitHub Release with:
   - `.mcaddon`
   - behavior pack `.mcpack`
   - resource pack `.mcpack`
   - SHA-256 checksums

## Notes

- Lucky ore only appears in chunks generated after the add-on is installed.
- Existing chunks are not retrofitted.
- Use world-specific pack folders under `worlds/<level-name>/...`, not `development_behavior_packs` or `development_resource_packs`, for Bedrock Dedicated Server runtime installs.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Security

See [SECURITY.md](./SECURITY.md).

## License

Released under the [MIT License](./LICENSE).
