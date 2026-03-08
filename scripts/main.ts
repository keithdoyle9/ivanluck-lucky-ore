import { ItemStack, world } from "@minecraft/server";

const LUCKY_ORE_BLOCK_ID = "ivanluck:lucky_ore";
const BAD_LUCK_POISON_AND_SLOWNESS_CHANCE = 0.1;
const BAD_LUCK_SILVERFISH_CHANCE = 0.05;
const BAD_LUCK_JUNK_DROP_CHANCE = 0.05;

const junkDrops = [
  { item: "minecraft:dirt", min: 2, max: 5 },
  { item: "minecraft:cobblestone", min: 2, max: 5 },
  { item: "minecraft:gravel", min: 2, max: 4 },
  { item: "minecraft:rotten_flesh", min: 1, max: 3 },
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

world.afterEvents.playerBreakBlock.subscribe((event) => {
  if (event.brokenBlockPermutation.type.id !== LUCKY_ORE_BLOCK_ID) {
    return;
  }

  const roll = Math.random();

  if (roll < BAD_LUCK_POISON_AND_SLOWNESS_CHANCE) {
    event.player.addEffect("minecraft:poison", 100, {
      amplifier: 0,
      showParticles: true,
    });
    event.player.addEffect("minecraft:slowness", 120, {
      amplifier: 0,
      showParticles: true,
    });
    event.player.sendMessage("Bad luck. The ore cursed your harvest.");
    return;
  }

  if (roll < BAD_LUCK_POISON_AND_SLOWNESS_CHANCE + BAD_LUCK_SILVERFISH_CHANCE) {
    event.dimension.spawnEntity("minecraft:silverfish", event.block.location);
    event.player.sendMessage("Bad luck. A silverfish crawled out of the ore.");
    return;
  }

  if (
    roll <
    BAD_LUCK_POISON_AND_SLOWNESS_CHANCE +
      BAD_LUCK_SILVERFISH_CHANCE +
      BAD_LUCK_JUNK_DROP_CHANCE
  ) {
    const junkDrop = junkDrops[randomInt(0, junkDrops.length - 1)];
    const count = randomInt(junkDrop.min, junkDrop.max);

    event.dimension.spawnItem(
      new ItemStack(junkDrop.item, count),
      event.block.location,
    );
    event.player.sendMessage("Bad luck. The ore also spat out some junk.");
  }
});
