import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const host = process.env.BEDROCK_HOST;
const serverRoot = process.env.BEDROCK_SERVER_ROOT ?? "/home/ubuntu/bedrock-server";
const serviceName = process.env.BEDROCK_SERVICE ?? "bedrock";
const shouldRestart = process.env.BEDROCK_RESTART === "true";

const behaviorPackId = "C33CEE03-8A8F-4DCB-BCE6-CA5452C41D6E";
const resourcePackId = "C27EA254-250B-4640-8E08-36F6195290BD";
const packVersion = [1, 0, 0];

const stagedBehaviorPack = path.join(repoRoot, "dist/server/behavior_packs/ivanluck");
const stagedResourcePack = path.join(repoRoot, "dist/server/resource_packs/ivanluck");

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options
  }).trim();
}

function runStreaming(command, args, options = {}) {
  execFileSync(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
    ...options
  });
}

function ssh(command) {
  return run("ssh", [host, command]);
}

function sshStreaming(command) {
  runStreaming("ssh", [host, command]);
}

function scp(localPath, remotePath) {
  runStreaming("scp", ["-r", localPath, `${host}:${remotePath}`]);
}

function ensureBuiltArtifacts() {
  if (fs.existsSync(stagedBehaviorPack) && fs.existsSync(stagedResourcePack)) {
    return;
  }

  runStreaming("npm", ["run", "build"]);
}

function readRemoteText(remotePath) {
  try {
    return ssh(`cat "${remotePath}"`);
  } catch {
    return "";
  }
}

function mergePackList(rawText, packId) {
  let current = [];

  if (rawText.trim()) {
    current = JSON.parse(rawText);
  }

  const filtered = Array.isArray(current)
    ? current.filter((entry) => entry?.pack_id !== packId)
    : [];

  filtered.push({
    pack_id: packId,
    version: packVersion
  });

  return JSON.stringify(filtered, null, 2) + "\n";
}

function upsertProperty(rawText, key, value) {
  const line = `${key}=${value}`;
  const matcher = new RegExp(`^${key}=.*$`, "m");

  if (matcher.test(rawText)) {
    return rawText.replace(matcher, line);
  }

  return rawText.endsWith("\n") ? `${rawText}${line}\n` : `${rawText}\n${line}\n`;
}

function writeTempFile(name, contents) {
  const tempPath = path.join(os.tmpdir(), name);
  fs.writeFileSync(tempPath, contents);
  return tempPath;
}

function main() {
  if (!host) {
    throw new Error("BEDROCK_HOST is required, for example: BEDROCK_HOST=root@example.com");
  }

  ensureBuiltArtifacts();

  const worldName = ssh(`grep '^level-name=' "${serverRoot}/server.properties" | cut -d= -f2-`);
  const worldRoot = `${serverRoot}/worlds/${worldName}`;

  console.log(`Deploy target: ${host}`);
  console.log(`Server root: ${serverRoot}`);
  console.log(`World: ${worldName}`);

  const worldBehaviorPacksPath = `${worldRoot}/world_behavior_packs.json`;
  const worldResourcePacksPath = `${worldRoot}/world_resource_packs.json`;
  const serverPropertiesPath = `${serverRoot}/server.properties`;

  const mergedBehaviorPacks = mergePackList(readRemoteText(worldBehaviorPacksPath), behaviorPackId);
  const mergedResourcePacks = mergePackList(readRemoteText(worldResourcePacksPath), resourcePackId);

  let serverProperties = readRemoteText(serverPropertiesPath);
  serverProperties = upsertProperty(serverProperties, "texturepack-required", "true");
  serverProperties = upsertProperty(serverProperties, "content-log-console-output-enabled", "true");

  const tmpBehaviorJson = writeTempFile("ivanluck-world_behavior_packs.json", mergedBehaviorPacks);
  const tmpResourceJson = writeTempFile("ivanluck-world_resource_packs.json", mergedResourcePacks);
  const tmpServerProperties = writeTempFile("ivanluck-server.properties", serverProperties);

  const remoteTempDir = ssh(`mktemp -d /tmp/ivanluck-deploy.XXXXXX`);

  scp(stagedBehaviorPack, `${remoteTempDir}/behavior_pack_upload`);
  scp(stagedResourcePack, `${remoteTempDir}/resource_pack_upload`);
  scp(tmpBehaviorJson, `${remoteTempDir}/world_behavior_packs.json`);
  scp(tmpResourceJson, `${remoteTempDir}/world_resource_packs.json`);
  scp(tmpServerProperties, `${remoteTempDir}/server.properties`);

  sshStreaming(`
set -e
SERVER_ROOT="${serverRoot}"
WORLD_NAME="${worldName}"
WORLD_ROOT="$SERVER_ROOT/worlds/$WORLD_NAME"
TMP_DIR="${remoteTempDir}"
BACKUP_ROOT="$SERVER_ROOT/deploy_backups/ivanluck-$(date +%s)"
mkdir -p "$WORLD_ROOT/behavior_packs" "$WORLD_ROOT/resource_packs"
mkdir -p "$BACKUP_ROOT/behavior_packs" "$BACKUP_ROOT/resource_packs"
find "$WORLD_ROOT/behavior_packs" -maxdepth 1 -type d -name 'ivanluck.bak.*' -exec mv {} "$BACKUP_ROOT/behavior_packs/" \\;
find "$WORLD_ROOT/resource_packs" -maxdepth 1 -type d -name 'ivanluck.bak.*' -exec mv {} "$BACKUP_ROOT/resource_packs/" \\;
if [ -e "$WORLD_ROOT/behavior_packs/ivanluck" ]; then
  mv "$WORLD_ROOT/behavior_packs/ivanluck" "$BACKUP_ROOT/behavior_packs/ivanluck"
fi
if [ -e "$WORLD_ROOT/resource_packs/ivanluck" ]; then
  mv "$WORLD_ROOT/resource_packs/ivanluck" "$BACKUP_ROOT/resource_packs/ivanluck"
fi
mv "$TMP_DIR/behavior_pack_upload" "$WORLD_ROOT/behavior_packs/ivanluck"
mv "$TMP_DIR/resource_pack_upload" "$WORLD_ROOT/resource_packs/ivanluck"
mv "$TMP_DIR/world_behavior_packs.json" "$WORLD_ROOT/world_behavior_packs.json"
mv "$TMP_DIR/world_resource_packs.json" "$WORLD_ROOT/world_resource_packs.json"
mv "$TMP_DIR/server.properties" "$SERVER_ROOT/server.properties"
chown -R ubuntu:ubuntu "$WORLD_ROOT/behavior_packs/ivanluck" "$WORLD_ROOT/resource_packs/ivanluck" "$WORLD_ROOT/world_behavior_packs.json" "$WORLD_ROOT/world_resource_packs.json" "$SERVER_ROOT/server.properties"
`);

  if (!shouldRestart) {
    console.log("Deploy completed without restarting the server.");
    console.log(`Set BEDROCK_RESTART=true to restart the ${serviceName} service automatically.`);
    return;
  }

  sshStreaming(`
set -e
systemctl restart "${serviceName}"
sleep 2
systemctl --no-pager --full status "${serviceName}" | sed -n '1,25p'
echo
journalctl -u "${serviceName}" -n 60 --no-pager
`);
}

main();
