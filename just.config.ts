import { argv, parallel, series, task, tscTask } from "just-scripts";
import {
  BundleTaskParameters,
  STANDARD_CLEAN_PATHS,
  DEFAULT_CLEAN_DIRECTORIES,
  bundleTask,
  cleanTask,
  cleanCollateralTask,
  coreLint,
  mcaddonTask,
  setupEnvironment,
  ZipTaskParameters
} from "@minecraft/core-build-tasks";
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

setupEnvironment(path.resolve(__dirname, ".env"));

process.env.PROJECT_NAME ||= "ivanluck";
process.env.MINECRAFT_PRODUCT ||= "BedrockGDK";
process.env.CUSTOM_DEPLOYMENT_PATH ||= "";

const projectName = process.env.PROJECT_NAME ?? "ivanluck";
const behaviorPackSource = path.resolve(__dirname, `behavior_packs/${projectName}`);
const resourcePackSource = path.resolve(__dirname, `resource_packs/${projectName}`);
const stagedRoot = path.resolve(__dirname, "dist/server");
const stagedBehaviorPack = path.join(stagedRoot, "behavior_packs", projectName);
const stagedResourcePack = path.join(stagedRoot, "resource_packs", projectName);

const bundleTaskOptions: BundleTaskParameters = {
  entryPoint: path.join(__dirname, "./scripts/main.ts"),
  external: ["@minecraft/server"],
  outfile: path.resolve(__dirname, "./dist/scripts/main.js"),
  minifyWhitespace: false,
  sourcemap: true,
  outputSourcemapPath: path.resolve(__dirname, "./dist/debug")
};

const mcaddonTaskOptions: ZipTaskParameters = {
  copyToBehaviorPacks: [`./behavior_packs/${projectName}`],
  copyToScripts: ["./dist/scripts"],
  copyToResourcePacks: [`./resource_packs/${projectName}`],
  outputFile: `./dist/packages/${projectName}.mcaddon`
};

function copyDirectory(source: string, target: string) {
  fs.mkdirSync(target, { recursive: true });
  fs.cpSync(source, target, { force: true, recursive: true });
}

task("lint", coreLint(["scripts/**/*.ts"], argv().fix));
task("typescript", tscTask());
task("bundle", bundleTask(bundleTaskOptions));
task("clean-local", cleanTask(DEFAULT_CLEAN_DIRECTORIES));
task("clean-collateral", cleanCollateralTask(STANDARD_CLEAN_PATHS));
task("clean", parallel("clean-local", "clean-collateral"));
task("assets", async () => {
  execFileSync("node", [path.resolve(__dirname, "tools/generate_textures.mjs")], {
    stdio: "inherit"
  });
});
task("stage-server", async () => {
  fs.rmSync(stagedRoot, { force: true, recursive: true });
  copyDirectory(behaviorPackSource, stagedBehaviorPack);
  copyDirectory(resourcePackSource, stagedResourcePack);
  copyDirectory(path.resolve(__dirname, "dist/scripts"), path.join(stagedBehaviorPack, "scripts"));
});
task("build", series("assets", "typescript", "bundle", "stage-server"));
task("createMcaddonFile", mcaddonTask(mcaddonTaskOptions));
task("mcaddon", series("clean-local", "build", "createMcaddonFile"));
