// ============================================================
// ppl_rpg.js  —  RPG Game Layer  (Phase 0: Data + Hub stub)
// Loaded lazily into ppl_workout.html via openRPG()
// Shares scope with main app: sessions, profile, computeAllXP,
// computeCharLevel, levelFromXP, getProfile, saveProfile, etc.
// ============================================================

'use strict';

// ── CONSTANTS ────────────────────────────────────────────────────────────────

const RPG_VERSION = '0.1.0';

const RPG_PROFILE_KEY  = 'ppl_profile';       // shared with main app
const RPG_INVENTORY_KEY = 'ppl_rpg_inventory';
const RPG_COMBAT_KEY    = 'ppl_rpg_combat';

// Band power constants — enemy stats derived from these, NOT from player stats
const BAND_POWER = {
  '1-5':   100,
  '6-10':  140,
  '11-15': 185,
  '16-20': 235,
  '21-25': 290,
  '26-30': 350,
  '31-35': 420,
  '36-40': 500,
  '41-45': 590,
  '46-50': 690,
};

// Castle upgrade tier costs (level 1–5)
const CASTLE_TIER_COSTS = [1000, 2000, 4000, 7000, 11000];

function rpgCastleUpgradeCost(currentLevel) {
  // currentLevel is 0-based — returns cost to upgrade TO currentLevel+1
  // Returns null if already at max (no more upgrades)
  return CASTLE_TIER_COSTS[currentLevel] || null;
}

// ── INTERVAL TYPES ───────────────────────────────────────────────────────────
// fast: 9–12 ticks  |  standard: 12–14  |  slow: 15–18
function spawnInterval(type) {
  const ranges = { fast: [14, 18], standard: [18, 22], slow: [22, 26] };
  const [lo, hi] = ranges[type] || ranges.standard;
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

// ── VARIANCE HELPER ──────────────────────────────────────────────────────────
const variance = () => 0.9 + Math.random() * 0.2;   // ±10%

// ============================================================
// ENEMY DATA
// Format: { id, name, band, tier, atkMult, hpMult,
//           goldMin, goldMax, diffScore, intervalType, flavor }
// Enemy ATK = BAND_POWER[band] × atkMult × variance()
// Enemy HP  = BAND_POWER[band] × hpMult  × variance()
// ============================================================

const RPG_ENEMIES = [

  // ── BAND 1-5 ─────────────────────────────────────────────────────────────

  { id:'mud_rat',          name:'Mud Rat',          band:'1-5',   tier:'easy',   atkMult:0.11, hpMult:0.49, goldMin:5,   goldMax:10,  diffScore:50,  intervalType:'fast',     flavor:'Skitters from the shadows.  More teeth than sense.' },
  { id:'feral_hound',      name:'Feral Hound',      band:'1-5',   tier:'easy',   atkMult:0.11, hpMult:0.52, goldMin:6,   goldMax:12,  diffScore:51,  intervalType:'standard', flavor:'Ribs showing, eyes wild.  Hunger makes it fearless.' },
  { id:'bog_sprite',       name:'Bog Sprite',       band:'1-5',   tier:'easy',   atkMult:0.11, hpMult:0.45, goldMin:5,   goldMax:9,   diffScore:48,  intervalType:'fast',     flavor:'Tiny.  Vicious.  Travels in silence, arrives in pain.' },
  { id:'goblin_scrapper',  name:'Goblin Scrapper',  band:'1-5',   tier:'medium', atkMult:0.19, hpMult:1.9, goldMin:12,  goldMax:20,  diffScore:75,  intervalType:'fast',     flavor:'Barely armed.  Makes up for it with spite.' },
  { id:'hollow_shade',     name:'Hollow Shade',     band:'1-5',   tier:'medium', atkMult:0.19, hpMult:2.04, goldMin:11,  goldMax:18,  diffScore:73,  intervalType:'standard', flavor:'Darker than the dark around it.' },
  { id:'bog_toad',         name:'Bog Toad',         band:'1-5',   tier:'medium', atkMult:0.19, hpMult:2.19, goldMin:13,  goldMax:22,  diffScore:77,  intervalType:'slow',     flavor:'Slow until it isn\'t.  Its tongue is the last thing you see.' },
  { id:'rotwood_shambler', name:'Rotwood Shambler', band:'1-5',   tier:'hard',   atkMult:0.23, hpMult:1.9, goldMin:30,  goldMax:50,  diffScore:135, intervalType:'slow',     flavor:'A corpse that forgot to stop moving.' },
  { id:'crypt_crawler',    name:'Crypt Crawler',    band:'1-5',   tier:'hard',   atkMult:0.25, hpMult:2.04, goldMin:28,  goldMax:46,  diffScore:133, intervalType:'standard', flavor:'Found in places that should be sealed.' },
  { id:'stone_sentry',     name:'Stone Sentry',     band:'1-5',   tier:'hard',   atkMult:0.25, hpMult:2.19, goldMin:32,  goldMax:52,  diffScore:138, intervalType:'slow',     flavor:'Built to keep things out.  Indifferent to which things.' },

  // ── BAND 6-10 ────────────────────────────────────────────────────────────

  { id:'giant_rat',        name:'Giant Rat',        band:'6-10',  tier:'easy',   atkMult:0.11, hpMult:0.52, goldMin:8,   goldMax:15,  diffScore:50,  intervalType:'fast',     flavor:'The size of a dog.  The temperament of a nightmare.' },
  { id:'scabwing_bat',     name:'Scabwing Bat',     band:'6-10',  tier:'easy',   atkMult:0.11, hpMult:0.54, goldMin:7,   goldMax:14,  diffScore:50,  intervalType:'fast',     flavor:'Cave-blind and cave-mean.  Echolocates your regret.' },
  { id:'swamp_leech',      name:'Swamp Leech',      band:'6-10',  tier:'easy',   atkMult:0.11, hpMult:0.56, goldMin:8,   goldMax:14,  diffScore:52,  intervalType:'slow',     flavor:'The water looked safe.  It wasn\'t.' },
  { id:'goblin_bruiser',   name:'Goblin Bruiser',   band:'6-10',  tier:'medium', atkMult:0.19, hpMult:1.9, goldMin:18,  goldMax:28,  diffScore:78,  intervalType:'standard', flavor:'Found a club.  Considers itself nobility.' },
  { id:'spore_wisp',       name:'Spore Wisp',       band:'6-10',  tier:'medium', atkMult:0.19, hpMult:1.82, goldMin:17,  goldMax:26,  diffScore:77,  intervalType:'fast',     flavor:'Beautiful from a distance.  Toxic at any range.' },
  { id:'mossclaw_bear',    name:'Mossclaw Bear',    band:'6-10',  tier:'medium', atkMult:0.19, hpMult:2.19, goldMin:20,  goldMax:32,  diffScore:82,  intervalType:'slow',     flavor:'Has been eating travelers since before the road was built.' },
  { id:'crypt_walker',     name:'Crypt Walker',     band:'6-10',  tier:'hard',   atkMult:0.23, hpMult:1.9, goldMin:40,  goldMax:65,  diffScore:138, intervalType:'slow',     flavor:'It does not know it is dead.  It does not care.' },
  { id:'rusted_automaton', name:'Rusted Automaton', band:'6-10',  tier:'hard',   atkMult:0.25, hpMult:2.04, goldMin:42,  goldMax:68,  diffScore:140, intervalType:'slow',     flavor:'Centuries old.  Still effective.  Barely.' },
  { id:'barrow_knight',    name:'Barrow Knight',    band:'6-10',  tier:'hard',   atkMult:0.25, hpMult:1.9, goldMin:38,  goldMax:62,  diffScore:138, intervalType:'standard', flavor:'Buried with full honors.  Rose without them.' },

  // ── BAND 11-15 ───────────────────────────────────────────────────────────

  { id:'dire_rat',         name:'Dire Rat',         band:'11-15', tier:'easy',   atkMult:0.11, hpMult:0.56, goldMin:12,  goldMax:20,  diffScore:51,  intervalType:'fast',     flavor:'Old, scarred, and mean.  Survived everything the forest threw at it.' },
  { id:'thornback_wolf',   name:'Thornback Wolf',   band:'11-15', tier:'easy',   atkMult:0.11, hpMult:0.6, goldMin:14,  goldMax:22,  diffScore:55,  intervalType:'standard', flavor:'Spine-quilled and silent.  You hear the pack after the first bite.' },
  { id:'crumble_golem',    name:'Crumble Golem',    band:'11-15', tier:'easy',   atkMult:0.11, hpMult:0.68, goldMin:13,  goldMax:21,  diffScore:56,  intervalType:'slow',     flavor:'Half-finished.  The half that works is the dangerous half.' },
  { id:'hobgoblin_warrior',name:'Hobgoblin Warrior',band:'11-15', tier:'medium', atkMult:0.19, hpMult:1.9, goldMin:25,  goldMax:40,  diffScore:82,  intervalType:'standard', flavor:'Organized.  Armored.  Angry about it.' },
  { id:'venomfang_asp',    name:'Venomfang Asp',    band:'11-15', tier:'medium', atkMult:0.19, hpMult:1.82, goldMin:24,  goldMax:38,  diffScore:80,  intervalType:'fast',     flavor:'Coiled in the grass.  Patient as stone.' },
  { id:'frostborn_wraith', name:'Frostborn Wraith', band:'11-15', tier:'medium', atkMult:0.19, hpMult:2.04, goldMin:26,  goldMax:42,  diffScore:83,  intervalType:'standard', flavor:'Killed in winter.  Never warmed up to the idea of staying dead.' },
  { id:'iron_sentinel',    name:'Iron Sentinel',    band:'11-15', tier:'hard',   atkMult:0.23, hpMult:2.04, goldMin:60,  goldMax:90,  diffScore:147, intervalType:'slow',     flavor:'Built to guard.  Has not received orders in centuries.  Still guarding.' },
  { id:'plague_revenant',  name:'Plague Revenant',  band:'11-15', tier:'hard',   atkMult:0.25, hpMult:1.9, goldMin:58,  goldMax:88,  diffScore:147, intervalType:'standard', flavor:'Died of the sickness.  Passed it on.' },
  { id:'ashbone_archer',   name:'Ashbone Archer',   band:'11-15', tier:'hard',   atkMult:0.25, hpMult:1.9, goldMin:62,  goldMax:92,  diffScore:146, intervalType:'fast',     flavor:'Hollow ribs.  Never misses.  Hasn\'t for a hundred years.' },

  // ── BAND 16-20 ───────────────────────────────────────────────────────────

  { id:'plague_rat',       name:'Plague Rat',       band:'16-20', tier:'easy',   atkMult:0.11, hpMult:1.05, goldMin:16,  goldMax:26,  diffScore:52,  intervalType:'fast',     flavor:'The bite is the least of your concerns.' },
  { id:'razorwing_harpy',  name:'Razorwing Harpy',  band:'16-20', tier:'easy',   atkMult:0.11, hpMult:1.12, goldMin:17,  goldMax:27,  diffScore:54,  intervalType:'fast',     flavor:'Circling.  Always circling.' },
  { id:'mud_elemental',    name:'Mud Elemental',    band:'16-20', tier:'easy',   atkMult:0.11, hpMult:0.71, goldMin:15,  goldMax:24,  diffScore:56,  intervalType:'slow',     flavor:'Older than the swamp.  Angrier than the rain.' },
  { id:'troll_whelp',      name:'Troll Whelp',      band:'16-20', tier:'medium', atkMult:0.19, hpMult:2.04, goldMin:35,  goldMax:55,  diffScore:86,  intervalType:'slow',     flavor:'Half grown.  Twice as reckless for it.' },
  { id:'shadowmeld_panther',name:'Shadowmeld Panther',band:'16-20',tier:'medium',atkMult:0.19, hpMult:1.9, goldMin:33,  goldMax:52,  diffScore:85,  intervalType:'fast',     flavor:'The shadow that moves wrong.' },
  { id:'corrupted_dryad',  name:'Corrupted Dryad',  band:'16-20', tier:'medium', atkMult:0.19, hpMult:2.19, goldMin:36,  goldMax:56,  diffScore:87,  intervalType:'standard', flavor:'The forest is sick.  So is she.' },
  { id:'death_knight',     name:'Death Knight',     band:'16-20', tier:'hard',   atkMult:0.25, hpMult:2.04, goldMin:80,  goldMax:120, diffScore:154, intervalType:'standard', flavor:'Sworn to a lord long dead.  The oath remains.' },
  { id:'voidstone_golem',  name:'Voidstone Golem',  band:'16-20', tier:'hard',   atkMult:0.23, hpMult:2.26, goldMin:82,  goldMax:125, diffScore:158, intervalType:'slow',     flavor:'Carved from a stone that should not exist.' },
  { id:'wailing_banshee',  name:'Wailing Banshee',  band:'16-20', tier:'hard',   atkMult:0.25, hpMult:1.9, goldMin:78,  goldMax:118, diffScore:152, intervalType:'fast',     flavor:'The scream precedes her.  Courtesy.' },

  // ── BAND 21-25 ───────────────────────────────────────────────────────────

  { id:'marsh_wraith',     name:'Marsh Wraith',     band:'21-25', tier:'easy',   atkMult:0.11, hpMult:1.12, goldMin:20,  goldMax:32,  diffScore:55,  intervalType:'standard', flavor:'It was something once.  Now it haunts the edges of things.' },
  { id:'stoneback_boar',   name:'Stoneback Boar',   band:'21-25', tier:'easy',   atkMult:0.11, hpMult:1.27, goldMin:22,  goldMax:35,  diffScore:59,  intervalType:'slow',     flavor:'Hides like granite.  Charges like an avalanche.' },
  { id:'gloom_imp',        name:'Gloom Imp',        band:'21-25', tier:'easy',   atkMult:0.11, hpMult:1.05, goldMin:19,  goldMax:30,  diffScore:53,  intervalType:'fast',     flavor:'Small, irritating, and somehow everywhere at once.' },
  { id:'forest_troll',     name:'Forest Troll',     band:'21-25', tier:'medium', atkMult:0.19, hpMult:2.19, goldMin:45,  goldMax:70,  diffScore:90,  intervalType:'slow',     flavor:'Older than the trees.  Angrier than the storm.' },
  { id:'emberclaw_drake',  name:'Emberclaw Drake',  band:'21-25', tier:'medium', atkMult:0.19, hpMult:2.04, goldMin:44,  goldMax:68,  diffScore:90,  intervalType:'standard', flavor:'Too young to breathe fire properly.  Still trying.' },
  { id:'blightwood_spider',name:'Blightwood Spider',band:'21-25', tier:'medium', atkMult:0.19, hpMult:1.9, goldMin:46,  goldMax:72,  diffScore:91,  intervalType:'fast',     flavor:'The web covers two trees.  She covers three.' },
  { id:'bone_colossus',    name:'Bone Colossus',    band:'21-25', tier:'hard',   atkMult:0.23, hpMult:2.26, goldMin:100, goldMax:150, diffScore:160, intervalType:'slow',     flavor:'Assembled from the remains of a hundred fallen warriors.' },
  { id:'chaos_elemental',  name:'Chaos Elemental',  band:'21-25', tier:'hard',   atkMult:0.25, hpMult:2.04, goldMin:98,  goldMax:148, diffScore:159, intervalType:'standard', flavor:'Fire, stone, and storm arguing with each other.  Directed at you.' },
  { id:'corrupted_paladin',name:'Corrupted Paladin',band:'21-25', tier:'hard',   atkMult:0.25, hpMult:1.9, goldMin:102, goldMax:155, diffScore:160, intervalType:'standard', flavor:'The armor is still polished.  The soul is not.' },

  // ── BAND 26-30 ───────────────────────────────────────────────────────────

  { id:'phantom_hound',    name:'Phantom Hound',    band:'26-30', tier:'easy',   atkMult:0.11, hpMult:1.07, goldMin:26,  goldMax:40,  diffScore:57,  intervalType:'standard', flavor:'Leaves no tracks.  Makes no sound.  Already behind you.' },
  { id:'cursed_scarecrow', name:'Cursed Scarecrow', band:'26-30', tier:'easy',   atkMult:0.11, hpMult:1.5, goldMin:24,  goldMax:38,  diffScore:58,  intervalType:'slow',     flavor:'The field it guards has been dead for years.' },
  { id:'barbed_viper',     name:'Barbed Viper',     band:'26-30', tier:'easy',   atkMult:0.11, hpMult:1.05, goldMin:25,  goldMax:39,  diffScore:56,  intervalType:'fast',     flavor:'A second set of fangs.  For emergencies.' },
  { id:'dark_ranger',      name:'Dark Ranger',      band:'26-30', tier:'medium', atkMult:0.19, hpMult:2.92, goldMin:55,  goldMax:85,  diffScore:92,  intervalType:'standard', flavor:'Served the kingdom.  The kingdom is gone.  The arrows remain.' },
  { id:'scalehide_drake',  name:'Scalehide Drake',  band:'26-30', tier:'medium', atkMult:0.19, hpMult:1.88, goldMin:56,  goldMax:88,  diffScore:96,  intervalType:'slow',     flavor:'Graduated from singed to scorched.' },
  { id:'thornwraith',      name:'Thornwraith',      band:'26-30', tier:'medium', atkMult:0.19, hpMult:2.29, goldMin:54,  goldMax:84,  diffScore:94,  intervalType:'standard', flavor:'Roots, thorn, and old hatred.  The forest\'s revenge.' },
  { id:'shadow_lich',      name:'Shadow Lich',      band:'26-30', tier:'hard',   atkMult:0.23, hpMult:1.88, goldMin:130, goldMax:180, diffScore:170, intervalType:'fast',     flavor:'Traded mortality for this.  The math was wrong.' },
  { id:'ironclad_revenant',name:'Ironclad Revenant',band:'26-30', tier:'hard',   atkMult:0.25, hpMult:2.29, goldMin:128, goldMax:178, diffScore:172, intervalType:'slow',     flavor:'Died in full plate.  Returned in full plate.' },
  { id:'ashstorm_elemental',name:'Ashstorm Elemental',band:'26-30',tier:'hard',  atkMult:0.25, hpMult:1.88, goldMin:132, goldMax:182, diffScore:169, intervalType:'standard', flavor:'Born from a battlefield fire that never went out.' },

  // ── BAND 31-35 ───────────────────────────────────────────────────────────

  { id:'wight',            name:'Wight',            band:'31-35', tier:'easy',   atkMult:0.11, hpMult:1.12, goldMin:32,  goldMax:50,  diffScore:59,  intervalType:'standard', flavor:'Cold intelligence behind empty eyes.' },
  { id:'stone_gargoyle',   name:'Stone Gargoyle',   band:'31-35', tier:'easy',   atkMult:0.11, hpMult:1.42, goldMin:34,  goldMax:53,  diffScore:62,  intervalType:'slow',     flavor:'Perched so long it forgot it could move.  Now it remembers.' },
  { id:'razorfin_serpent', name:'Razorfin Serpent', band:'31-35', tier:'easy',   atkMult:0.11, hpMult:1.09, goldMin:30,  goldMax:48,  diffScore:59,  intervalType:'fast',     flavor:'River-dwelling.  Highly territorial.  You\'re in the river.' },
  { id:'ancient_troll',    name:'Ancient Troll',    band:'31-35', tier:'medium', atkMult:0.19, hpMult:2.19, goldMin:70,  goldMax:105, diffScore:100, intervalType:'slow',     flavor:'The forest grew around it.  The forest is afraid of it.' },
  { id:'infernus_drake',   name:'Infernus Drake',   band:'31-35', tier:'medium', atkMult:0.19, hpMult:2.04, goldMin:68,  goldMax:102, diffScore:99,  intervalType:'standard', flavor:'Finally figured out the fire thing.  Very enthusiastic about it.' },
  { id:'plague_knight',    name:'Plague Knight',    band:'31-35', tier:'medium', atkMult:0.19, hpMult:1.9, goldMin:72,  goldMax:108, diffScore:101, intervalType:'standard', flavor:'The sickness spread.  He made it a weapon.' },
  { id:'warlords_champion',name:"Warlord's Champion",band:'31-35',tier:'hard',   atkMult:0.25, hpMult:2.04, goldMin:160, goldMax:220, diffScore:178, intervalType:'standard', flavor:'Won every duel.  Expects to win this one.' },
  { id:'gravelord',        name:'Gravelord',        band:'31-35', tier:'hard',   atkMult:0.23, hpMult:2.26, goldMin:158, goldMax:218, diffScore:180, intervalType:'slow',     flavor:'Commands the dead.  Counts among them.' },
  { id:'arcane_stalker',   name:'Arcane Stalker',   band:'31-35', tier:'hard',   atkMult:0.25, hpMult:1.9, goldMin:162, goldMax:222, diffScore:178, intervalType:'fast',     flavor:'Magic made patient.  Hunting made precise.' },

  // ── BAND 36-40 ───────────────────────────────────────────────────────────

  { id:'dusk_specter',     name:'Dusk Specter',     band:'36-40', tier:'easy',   atkMult:0.11, hpMult:1.12, goldMin:40,  goldMax:62,  diffScore:61,  intervalType:'fast',     flavor:'Exists between moments.  Strikes in the gaps.' },
  { id:'ironhide_beetle',  name:'Ironhide Beetle',  band:'36-40', tier:'easy',   atkMult:0.11, hpMult:1.5, goldMin:38,  goldMax:60,  diffScore:64,  intervalType:'slow',     flavor:'Its carapace has turned away swords.  Many swords.' },
  { id:'ashwing_gargoyle', name:'Ashwing Gargoyle', band:'36-40', tier:'easy',   atkMult:0.11, hpMult:1.2, goldMin:39,  goldMax:61,  diffScore:63,  intervalType:'standard', flavor:'The stone form was a disguise.  Barely.' },
  { id:'void_stalker',     name:'Void Stalker',     band:'36-40', tier:'medium', atkMult:0.19, hpMult:2.04, goldMin:85,  goldMax:130, diffScore:104, intervalType:'fast',     flavor:'Hunts in the spaces between light and shadow.' },
  { id:'magma_drake',      name:'Magma Drake',      band:'36-40', tier:'medium', atkMult:0.19, hpMult:2.19, goldMin:86,  goldMax:132, diffScore:105, intervalType:'slow',     flavor:'Swam up from below the castle.  Still dripping.' },
  { id:'deathshroud_ranger',name:'Deathshroud Ranger',band:'36-40',tier:'medium',atkMult:0.19, hpMult:1.9, goldMin:84,  goldMax:128, diffScore:103, intervalType:'fast',     flavor:'The arrows are cursed.  The aim is not.' },
  { id:'fallen_paladin',   name:'Fallen Paladin',   band:'36-40', tier:'hard',   atkMult:0.25, hpMult:2.04, goldMin:200, goldMax:270, diffScore:188, intervalType:'standard', flavor:'The faith is gone.  The wrath remains.' },
  { id:'voidbound_colossus',name:'Voidbound Colossus',band:'36-40',tier:'hard',  atkMult:0.23, hpMult:2.26, goldMin:195, goldMax:265, diffScore:191, intervalType:'slow',     flavor:'Built from dark matter and worse intentions.' },
  { id:'lich_sovereign',   name:'Lich Sovereign',   band:'36-40', tier:'hard',   atkMult:0.25, hpMult:1.9, goldMin:202, goldMax:275, diffScore:189, intervalType:'fast',     flavor:'Has had centuries to perfect the art of not dying.' },

  // ── BAND 41-45 ───────────────────────────────────────────────────────────

  { id:'abyssal_hound',    name:'Abyssal Hound',    band:'41-45', tier:'easy',   atkMult:0.11, hpMult:1.2, goldMin:50,  goldMax:75,  diffScore:66,  intervalType:'fast',     flavor:'Bred in the dark.  Never seen the sun.  Does not miss it.' },
  { id:'dread_wisp',       name:'Dread Wisp',       band:'41-45', tier:'easy',   atkMult:0.11, hpMult:1.12, goldMin:48,  goldMax:72,  diffScore:62,  intervalType:'standard', flavor:'Ancient light turned malevolent.  It remembers being warm.' },
  { id:'void_imp',         name:'Void Imp',         band:'41-45', tier:'easy',   atkMult:0.11, hpMult:1.05, goldMin:46,  goldMax:70,  diffScore:62,  intervalType:'fast',     flavor:'Consumed by something worse.' },
  { id:'nightmare_ranger', name:'Nightmare Ranger', band:'41-45', tier:'medium', atkMult:0.19, hpMult:2.04, goldMin:105, goldMax:160, diffScore:110, intervalType:'fast',     flavor:'Arrows that find you regardless of cover.' },
  { id:'elder_drake',      name:'Elder Drake',      band:'41-45', tier:'medium', atkMult:0.19, hpMult:2.19, goldMin:107, goldMax:162, diffScore:112, intervalType:'slow',     flavor:'Has mastered the fire.  Is working on the patience.' },
  { id:'primordial_troll', name:'Primordial Troll', band:'41-45', tier:'medium', atkMult:0.19, hpMult:2.29, goldMin:108, goldMax:165, diffScore:112, intervalType:'slow',     flavor:'The Ancient Troll\'s older, quieter sibling.  Much quieter.' },
  { id:'arcane_golem',     name:'Arcane Golem',     band:'41-45', tier:'hard',   atkMult:0.23, hpMult:2.26, goldMin:250, goldMax:330, diffScore:201, intervalType:'slow',     flavor:'Powered by a spell its maker no longer remembers.' },
  { id:'dread_general',    name:'Dread General',    band:'41-45', tier:'hard',   atkMult:0.25, hpMult:2.04, goldMin:248, goldMax:328, diffScore:201, intervalType:'standard', flavor:'Commands armies that no longer exist.  Keeps the schedule anyway.' },
  { id:'obliteration_wraith',name:'Obliteration Wraith',band:'41-45',tier:'hard',atkMult:0.25, hpMult:1.9, goldMin:252, goldMax:335, diffScore:202, intervalType:'fast',     flavor:'Not haunting.  Consuming.' },

  // ── BAND 46-50 ───────────────────────────────────────────────────────────

  { id:'soul_eater',       name:'Soul Eater',       band:'46-50', tier:'easy',   atkMult:0.11, hpMult:1.2, goldMin:60,  goldMax:90,  diffScore:68,  intervalType:'fast',     flavor:'Takes more than your HP.' },
  { id:'void_wraith',      name:'Void Wraith',      band:'46-50', tier:'easy',   atkMult:0.11, hpMult:1.27, goldMin:62,  goldMax:93,  diffScore:69,  intervalType:'standard', flavor:'The last thing the old kingdom\'s mages created.  The last thing they did.' },
  { id:'abyss_crawler',    name:'Abyss Crawler',    band:'46-50', tier:'easy',   atkMult:0.11, hpMult:1.42, goldMin:58,  goldMax:88,  diffScore:69,  intervalType:'slow',     flavor:'Climbed up from somewhere deeper than the castle goes.' },
  { id:'elder_void_stalker',name:'Elder Void Stalker',band:'46-50',tier:'medium',atkMult:0.19, hpMult:2.19, goldMin:130, goldMax:200, diffScore:120, intervalType:'fast',     flavor:'Has hunted longer than most kingdoms have existed.' },
  { id:'legendary_drake',  name:'Legendary Drake',  band:'46-50', tier:'medium', atkMult:0.19, hpMult:2.04, goldMin:132, goldMax:202, diffScore:120, intervalType:'slow',     flavor:'Named in three languages.  Feared in all of them.' },
  { id:'wraith_sovereign', name:'Wraith Sovereign', band:'46-50', tier:'medium', atkMult:0.19, hpMult:2.29, goldMin:134, goldMax:205, diffScore:121, intervalType:'standard', flavor:'Rules the dead in the way the living never managed the living.' },
  { id:'dread_sovereign',  name:'Dread Sovereign',  band:'46-50', tier:'hard',   atkMult:0.25, hpMult:2.26, goldMin:320, goldMax:420, diffScore:222, intervalType:'standard', flavor:'Ruled in darkness for a thousand years.  Has not grown tired of it.' },
  { id:'eternal_golem',    name:'Eternal Golem',    band:'46-50', tier:'hard',   atkMult:0.25, hpMult:2.29, goldMin:315, goldMax:415, diffScore:223, intervalType:'slow',     flavor:'The original.  Everything else was an attempt to copy it.' },
  { id:'void_archon',      name:'Void Archon',      band:'46-50', tier:'hard',   atkMult:0.25, hpMult:2.04, goldMin:325, goldMax:425, diffScore:223, intervalType:'fast',     flavor:'Older than the world it is trying to unmake.' },
];

// ============================================================
// QUEST DATA
// 53 quests — 5-6 per level band, 2 easy + 2-3 medium + 1-2 hard each
// enemies: array of { enemyId, isBoss }
// bossGateHP: null or 0.8 (80% HP required to start boss fight)
// ============================================================

const RPG_QUESTS = [

  // ── BAND 1-5 ─────────────────────────────────────────────────────────────

  { id:'rat_infestation',       band:'1-5',   difficulty:'easy',   minLevel:1,
    name:'Rat Infestation',
    flavor:'Clear the cellar of its infestation before winter stores are ruined.',
    enemies:[{enemyId:'mud_rat',isBoss:false},{enemyId:'mud_rat',isBoss:false},{enemyId:'mud_rat',isBoss:false}],
    goldMin:40,  goldMax:60,  bossGateHP:null },

  { id:'defend_farmstead',      band:'1-5',   difficulty:'easy',   minLevel:1,
    name:'Defend the Farmstead',
    flavor:'Defend the Thornwall farm against the creatures emerging from the marsh.',
    enemies:[{enemyId:'bog_sprite',isBoss:false},{enemyId:'bog_sprite',isBoss:false},{enemyId:'feral_hound',isBoss:false}],
    goldMin:45,  goldMax:65,  bossGateHP:null },

  { id:'hunt_bog_terror',       band:'1-5',   difficulty:'medium', minLevel:1,
    name:'Hunt the Bog Terror',
    flavor:'Hunt down the Bog Toad that has been dragging livestock into the marsh.',
    enemies:[{enemyId:'bog_sprite',isBoss:false},{enemyId:'hollow_shade',isBoss:false},{enemyId:'bog_toad',isBoss:false}],
    goldMin:80,  goldMax:110, bossGateHP:null },

  { id:'survive_the_night',     band:'1-5',   difficulty:'medium', minLevel:1,
    name:'Survive the Night',
    flavor:'Survive the undead that rise when darkness falls over the old cemetery.',
    enemies:[{enemyId:'rotwood_shambler',isBoss:false},{enemyId:'crypt_crawler',isBoss:false}],
    goldMin:90,  goldMax:120, bossGateHP:null },

  { id:'slay_stone_warden',     band:'1-5',   difficulty:'hard',   minLevel:1,
    name:'Slay the Stone Warden',
    flavor:'Slay the Stone Sentry that has sealed the eastern gate of the ruins.',
    enemies:[{enemyId:'crypt_crawler',isBoss:false},{enemyId:'stone_sentry',isBoss:true}],
    goldMin:150, goldMax:200, bossGateHP:0.8 },

  { id:'clear_goblin_camp',     band:'1-5',   difficulty:'medium', minLevel:1,
    name:'Clear the Goblin Camp',
    flavor:'Clear the goblin camp that has been raiding the southern road since the last moon.',
    enemies:[{enemyId:'goblin_scrapper',isBoss:false},{enemyId:'goblin_scrapper',isBoss:false},{enemyId:'hollow_shade',isBoss:false}],
    goldMin:80,  goldMax:110, bossGateHP:null },

  // ── BAND 6-10 ────────────────────────────────────────────────────────────

  { id:'clear_grain_store',     band:'6-10',  difficulty:'easy',   minLevel:6,
    name:'Clear the Grain Store',
    flavor:'Clear the Giant Rats breeding in the village grain store before harvest season.',
    enemies:[{enemyId:'giant_rat',isBoss:false},{enemyId:'giant_rat',isBoss:false},{enemyId:'scabwing_bat',isBoss:false}],
    goldMin:55,  goldMax:75,  bossGateHP:null },

  { id:'defend_river_crossing', band:'6-10',  difficulty:'easy',   minLevel:6,
    name:'Defend the River Crossing',
    flavor:'Defend the Millford crossing against the goblin warband moving upriver.',
    enemies:[{enemyId:'goblin_bruiser',isBoss:false},{enemyId:'goblin_bruiser',isBoss:false},{enemyId:'swamp_leech',isBoss:false}],
    goldMin:60,  goldMax:85,  bossGateHP:null },

  { id:'hunt_mossclaw',         band:'6-10',  difficulty:'medium', minLevel:6,
    name:'Hunt the Mossclaw',
    flavor:'Hunt down the Mossclaw Bear that has been stalking the northern road.',
    enemies:[{enemyId:'giant_rat',isBoss:false},{enemyId:'goblin_bruiser',isBoss:false},{enemyId:'mossclaw_bear',isBoss:false}],
    goldMin:110, goldMax:150, bossGateHP:null },

  { id:'survive_crypt_assault', band:'6-10',  difficulty:'medium', minLevel:6,
    name:'Survive the Crypt Assault',
    flavor:'Survive the undead pouring from the Ashford crypt before the seal is restored.',
    enemies:[{enemyId:'crypt_walker',isBoss:false},{enemyId:'barrow_knight',isBoss:false}],
    goldMin:120, goldMax:160, bossGateHP:null },

  { id:'slay_iron_revenant',    band:'6-10',  difficulty:'hard',   minLevel:6,
    name:'Slay the Iron Revenant',
    flavor:'Slay the Rusted Automaton that has reactivated in the abandoned workshop.',
    enemies:[{enemyId:'barrow_knight',isBoss:false},{enemyId:'rusted_automaton',isBoss:true}],
    goldMin:200, goldMax:270, bossGateHP:0.8 },

  { id:'defend_spore_fields',   band:'6-10',  difficulty:'medium', minLevel:6,
    name:'Defend the Spore Fields',
    flavor:"Defend the alchemist's spore fields from the wisps that drift in from the marshes each harvest.",
    enemies:[{enemyId:'spore_wisp',isBoss:false},{enemyId:'spore_wisp',isBoss:false},{enemyId:'goblin_bruiser',isBoss:false}],
    goldMin:110, goldMax:145, bossGateHP:null },

  // ── BAND 11-15 ───────────────────────────────────────────────────────────

  { id:'hunt_dire_pack',        band:'11-15', difficulty:'easy',   minLevel:11,
    name:'Hunt the Dire Pack',
    flavor:'Hunt down the Dire Rat pack that has overrun the lower tunnels of the mine.',
    enemies:[{enemyId:'dire_rat',isBoss:false},{enemyId:'dire_rat',isBoss:false},{enemyId:'thornback_wolf',isBoss:false}],
    goldMin:70,  goldMax:95,  bossGateHP:null },

  { id:'defend_ironwall',       band:'11-15', difficulty:'easy',   minLevel:11,
    name:'Defend Ironwall Village',
    flavor:'Defend Ironwall village against the hobgoblin warband marching from the hills.',
    enemies:[{enemyId:'crumble_golem',isBoss:false},{enemyId:'thornback_wolf',isBoss:false},{enemyId:'thornback_wolf',isBoss:false}],
    goldMin:75,  goldMax:100, bossGateHP:null },

  { id:'clear_haunted_pass',    band:'11-15', difficulty:'medium', minLevel:11,
    name:'Clear the Haunted Pass',
    flavor:'Clear the Ashveil Pass of the wraiths blocking the merchant road.',
    enemies:[{enemyId:'venomfang_asp',isBoss:false},{enemyId:'hobgoblin_warrior',isBoss:false},{enemyId:'frostborn_wraith',isBoss:false}],
    goldMin:140, goldMax:185, bossGateHP:null },

  { id:'survive_plague_march',  band:'11-15', difficulty:'medium', minLevel:11,
    name:'Survive the Plague March',
    flavor:'Survive the Plague Revenant advance before the garrison walls are breached.',
    enemies:[{enemyId:'hobgoblin_warrior',isBoss:false},{enemyId:'plague_revenant',isBoss:false}],
    goldMin:150, goldMax:200, bossGateHP:null },

  { id:'slay_iron_sentinel',    band:'11-15', difficulty:'hard',   minLevel:11,
    name:'Slay the Iron Sentinel',
    flavor:'Slay the Iron Sentinel that guards the entrance to the sealed vault.',
    enemies:[{enemyId:'ashbone_archer',isBoss:false},{enemyId:'iron_sentinel',isBoss:true}],
    goldMin:260, goldMax:340, bossGateHP:0.8 },

  // ── BAND 16-20 ───────────────────────────────────────────────────────────

  { id:'hunt_plague_swarm',     band:'16-20', difficulty:'easy',   minLevel:16,
    name:'Hunt the Plague Swarm',
    flavor:'Hunt down the Plague Rat colony spreading sickness through the lower districts.',
    enemies:[{enemyId:'plague_rat',isBoss:false},{enemyId:'plague_rat',isBoss:false},{enemyId:'mud_elemental',isBoss:false}],
    goldMin:90,  goldMax:120, bossGateHP:null },

  { id:'defend_amber_road',     band:'16-20', difficulty:'easy',   minLevel:16,
    name:'Defend the Amber Road',
    flavor:'Defend the Amber Road trading post from the harpy flock descending from the crags.',
    enemies:[{enemyId:'razorwing_harpy',isBoss:false},{enemyId:'razorwing_harpy',isBoss:false},{enemyId:'plague_rat',isBoss:false}],
    goldMin:95,  goldMax:125, bossGateHP:null },

  { id:'clear_shadow_den',      band:'16-20', difficulty:'medium', minLevel:16,
    name:'Clear the Shadow Den',
    flavor:'Clear the Shadow Den of the corrupted creatures that have made it their lair.',
    enemies:[{enemyId:'shadowmeld_panther',isBoss:false},{enemyId:'troll_whelp',isBoss:false},{enemyId:'corrupted_dryad',isBoss:false}],
    goldMin:175, goldMax:230, bossGateHP:null },

  { id:'survive_banshee_wail',  band:'16-20', difficulty:'medium', minLevel:16,
    name:'Survive the Banshee Wail',
    flavor:'Survive the night of the Banshee Wail before the protective ward is restored.',
    enemies:[{enemyId:'voidstone_golem',isBoss:false},{enemyId:'wailing_banshee',isBoss:false}],
    goldMin:185, goldMax:245, bossGateHP:null },

  { id:'slay_death_knight',     band:'16-20', difficulty:'hard',   minLevel:16,
    name:'Slay the Death Knight',
    flavor:'Slay the Death Knight that commands the undead army besieging the eastern fort.',
    enemies:[{enemyId:'wailing_banshee',isBoss:false},{enemyId:'death_knight',isBoss:true}],
    goldMin:320, goldMax:420, bossGateHP:0.8 },

  // ── BAND 21-25 ───────────────────────────────────────────────────────────

  { id:'hunt_marsh_stalkers',   band:'21-25', difficulty:'easy',   minLevel:21,
    name:'Hunt the Marsh Stalkers',
    flavor:'Hunt down the Marsh Wraiths haunting the Greywood wetlands after the floods.',
    enemies:[{enemyId:'marsh_wraith',isBoss:false},{enemyId:'marsh_wraith',isBoss:false},{enemyId:'gloom_imp',isBoss:false}],
    goldMin:110, goldMax:145, bossGateHP:null },

  { id:'defend_stonegate',      band:'21-25', difficulty:'easy',   minLevel:21,
    name:'Defend the Stonegate',
    flavor:'Defend Stonegate Pass against the boar stampede driven down from the highlands.',
    enemies:[{enemyId:'stoneback_boar',isBoss:false},{enemyId:'stoneback_boar',isBoss:false},{enemyId:'gloom_imp',isBoss:false}],
    goldMin:115, goldMax:150, bossGateHP:null },

  { id:'clear_drake_nest',      band:'21-25', difficulty:'medium', minLevel:21,
    name:'Clear the Drake Nest',
    flavor:'Clear the Emberclaw Drake nest before it scorches the valley settlements.',
    enemies:[{enemyId:'blightwood_spider',isBoss:false},{enemyId:'forest_troll',isBoss:false},{enemyId:'emberclaw_drake',isBoss:false}],
    goldMin:215, goldMax:280, bossGateHP:null },

  { id:'survive_bone_tide',     band:'21-25', difficulty:'medium', minLevel:21,
    name:'Survive the Bone Tide',
    flavor:'Survive the Bone Colossus advance before the citadel gates can be sealed.',
    enemies:[{enemyId:'chaos_elemental',isBoss:false},{enemyId:'bone_colossus',isBoss:false}],
    goldMin:230, goldMax:300, bossGateHP:null },

  { id:'slay_corrupted_paladin',band:'21-25', difficulty:'hard',   minLevel:21,
    name:'Slay the Corrupted Paladin',
    flavor:'Slay the Corrupted Paladin that has taken command of the abandoned citadel.',
    enemies:[{enemyId:'chaos_elemental',isBoss:false},{enemyId:'corrupted_paladin',isBoss:true}],
    goldMin:400, goldMax:520, bossGateHP:0.8 },

  // ── BAND 26-30 ───────────────────────────────────────────────────────────

  { id:'hunt_phantom_pack',     band:'26-30', difficulty:'easy',   minLevel:26,
    name:'Hunt the Phantom Pack',
    flavor:'Hunt down the Phantom Hounds that have been picking off travelers on the night road.',
    enemies:[{enemyId:'phantom_hound',isBoss:false},{enemyId:'phantom_hound',isBoss:false},{enemyId:'barbed_viper',isBoss:false}],
    goldMin:130, goldMax:170, bossGateHP:null },

  { id:'defend_old_bridge',     band:'26-30', difficulty:'easy',   minLevel:26,
    name:'Defend the Old Bridge',
    flavor:'Defend the Old Bridge against the cursed scarecrows animated by the harvest witch.',
    enemies:[{enemyId:'cursed_scarecrow',isBoss:false},{enemyId:'cursed_scarecrow',isBoss:false},{enemyId:'barbed_viper',isBoss:false}],
    goldMin:135, goldMax:175, bossGateHP:null },

  { id:'clear_dark_wood',       band:'26-30', difficulty:'medium', minLevel:26,
    name:'Clear the Dark Wood',
    flavor:'Clear the Dark Wood of the ranger who has been ambushing supply caravans.',
    enemies:[{enemyId:'scalehide_drake',isBoss:false},{enemyId:'thornwraith',isBoss:false},{enemyId:'dark_ranger',isBoss:false}],
    goldMin:255, goldMax:335, bossGateHP:null },

  { id:'survive_revenant_march',band:'26-30', difficulty:'medium', minLevel:26,
    name:'Survive the Revenant March',
    flavor:'Survive the Ironclad Revenant advance on the crumbling garrison before dawn.',
    enemies:[{enemyId:'shadow_lich',isBoss:false},{enemyId:'ironclad_revenant',isBoss:false}],
    goldMin:270, goldMax:350, bossGateHP:null },

  { id:'slay_shadow_lich',      band:'26-30', difficulty:'hard',   minLevel:26,
    name:'Slay the Shadow Lich',
    flavor:'Slay the Shadow Lich that has claimed the Ashspire tower as its new throne.',
    enemies:[{enemyId:'ironclad_revenant',isBoss:false},{enemyId:'shadow_lich',isBoss:true}],
    goldMin:460, goldMax:600, bossGateHP:0.8 },

  { id:'slay_ashstorm',         band:'26-30', difficulty:'hard',   minLevel:26,
    name:'Slay the Ashstorm',
    flavor:'Slay the Ashstorm Elemental that has been incinerating everything within a mile of the Embervault ruins.',
    enemies:[{enemyId:'shadow_lich',isBoss:false},{enemyId:'ashstorm_elemental',isBoss:true}],
    goldMin:460, goldMax:600, bossGateHP:0.8 },

  // ── BAND 31-35 ───────────────────────────────────────────────────────────

  { id:'hunt_wights',           band:'31-35', difficulty:'easy',   minLevel:31,
    name:'Hunt the Wights',
    flavor:'Hunt down the Wights rising from the Gravemoor fields each night at dusk.',
    enemies:[{enemyId:'wight',isBoss:false},{enemyId:'wight',isBoss:false},{enemyId:'razorfin_serpent',isBoss:false}],
    goldMin:155, goldMax:200, bossGateHP:null },

  { id:'defend_quarry',         band:'31-35', difficulty:'easy',   minLevel:31,
    name:'Defend the Quarry',
    flavor:'Defend the Stonehaven quarry against the gargoyles nesting in the upper cliffs.',
    enemies:[{enemyId:'stone_gargoyle',isBoss:false},{enemyId:'stone_gargoyle',isBoss:false},{enemyId:'razorfin_serpent',isBoss:false}],
    goldMin:160, goldMax:210, bossGateHP:null },

  { id:'clear_plague_stronghold',band:'31-35',difficulty:'medium', minLevel:31,
    name:'Clear the Plague Stronghold',
    flavor:'Clear the Plague Knight stronghold blocking the mountain pass to the north.',
    enemies:[{enemyId:'infernus_drake',isBoss:false},{enemyId:'ancient_troll',isBoss:false},{enemyId:'plague_knight',isBoss:false}],
    goldMin:305, goldMax:395, bossGateHP:null },

  { id:'survive_champions_trial',band:'31-35',difficulty:'medium', minLevel:31,
    name:"Survive the Champion's Trial",
    flavor:"Survive the Warlord's Champion gauntlet inside the iron arena.",
    enemies:[{enemyId:'gravelord',isBoss:false},{enemyId:'warlords_champion',isBoss:false}],
    goldMin:320, goldMax:415, bossGateHP:null },

  { id:'slay_gravelord',        band:'31-35', difficulty:'hard',   minLevel:31,
    name:'Slay the Gravelord',
    flavor:'Slay the Gravelord commanding the undead army that surrounds the Ashwood keep.',
    enemies:[{enemyId:'arcane_stalker',isBoss:false},{enemyId:'gravelord',isBoss:true}],
    goldMin:540, goldMax:700, bossGateHP:0.8 },

  // ── BAND 36-40 ───────────────────────────────────────────────────────────

  { id:'hunt_dusk_specters',    band:'36-40', difficulty:'easy',   minLevel:36,
    name:'Hunt the Dusk Specters',
    flavor:'Hunt down the Dusk Specters haunting the Ashveil road after the last eclipse.',
    enemies:[{enemyId:'dusk_specter',isBoss:false},{enemyId:'dusk_specter',isBoss:false},{enemyId:'ashwing_gargoyle',isBoss:false}],
    goldMin:185, goldMax:240, bossGateHP:null },

  { id:'defend_iron_mine',      band:'36-40', difficulty:'easy',   minLevel:36,
    name:'Defend the Iron Mine',
    flavor:'Defend the Ironhide Mine against the beetles swarming up from the deep levels.',
    enemies:[{enemyId:'ironhide_beetle',isBoss:false},{enemyId:'ironhide_beetle',isBoss:false},{enemyId:'ashwing_gargoyle',isBoss:false}],
    goldMin:190, goldMax:245, bossGateHP:null },

  { id:'clear_void_hollow',     band:'36-40', difficulty:'medium', minLevel:36,
    name:'Clear the Void Hollow',
    flavor:'Clear the Void Hollow of the stalkers that have been pulling travelers into the dark.',
    enemies:[{enemyId:'deathshroud_ranger',isBoss:false},{enemyId:'magma_drake',isBoss:false},{enemyId:'void_stalker',isBoss:false}],
    goldMin:360, goldMax:465, bossGateHP:null },

  { id:'survive_colossus_siege',band:'36-40', difficulty:'medium', minLevel:36,
    name:'Survive the Colossus Siege',
    flavor:'Survive the Voidbound Colossus assault on the last standing watchtower.',
    enemies:[{enemyId:'lich_sovereign',isBoss:false},{enemyId:'voidbound_colossus',isBoss:false}],
    goldMin:375, goldMax:490, bossGateHP:null },

  { id:'slay_fallen_paladin',   band:'36-40', difficulty:'hard',   minLevel:36,
    name:'Slay the Fallen Paladin',
    flavor:'Slay the Fallen Paladin that has defiled the Ironlight cathedral and slaughtered its order.',
    enemies:[{enemyId:'lich_sovereign',isBoss:false},{enemyId:'fallen_paladin',isBoss:true}],
    goldMin:630, goldMax:820, bossGateHP:0.8 },

  // ── BAND 41-45 ───────────────────────────────────────────────────────────

  { id:'hunt_abyssal_hounds',   band:'41-45', difficulty:'easy',   minLevel:41,
    name:'Hunt the Abyssal Hounds',
    flavor:'Hunt down the Abyssal Hounds unleashed from the collapsing void gate.',
    enemies:[{enemyId:'abyssal_hound',isBoss:false},{enemyId:'abyssal_hound',isBoss:false},{enemyId:'void_imp',isBoss:false}],
    goldMin:220, goldMax:285, bossGateHP:null },

  { id:'defend_arcane_sanctum', band:'41-45', difficulty:'easy',   minLevel:41,
    name:'Defend the Arcane Sanctum',
    flavor:'Defend the last Arcane Sanctum against the dread wisps drawn to its light.',
    enemies:[{enemyId:'dread_wisp',isBoss:false},{enemyId:'dread_wisp',isBoss:false},{enemyId:'void_imp',isBoss:false}],
    goldMin:225, goldMax:290, bossGateHP:null },

  { id:'clear_nightmare_forest', band:'41-45',difficulty:'medium', minLevel:41,
    name:'Clear the Nightmare Forest',
    flavor:'Clear the Nightmare Forest of the elder creatures that have claimed it as their domain.',
    enemies:[{enemyId:'elder_drake',isBoss:false},{enemyId:'primordial_troll',isBoss:false},{enemyId:'nightmare_ranger',isBoss:false}],
    goldMin:425, goldMax:550, bossGateHP:null },

  { id:'survive_golem_awakening',band:'41-45',difficulty:'medium', minLevel:41,
    name:'Survive the Golem Awakening',
    flavor:'Survive the Arcane Golem awakening in the ruins of the old capital before it reaches the city.',
    enemies:[{enemyId:'dread_general',isBoss:false},{enemyId:'arcane_golem',isBoss:false}],
    goldMin:445, goldMax:575, bossGateHP:null },

  { id:'slay_dread_general',    band:'41-45', difficulty:'hard',   minLevel:41,
    name:'Slay the Dread General',
    flavor:'Slay the Dread General commanding the void army outside the last mortal city.',
    enemies:[{enemyId:'obliteration_wraith',isBoss:false},{enemyId:'dread_general',isBoss:true}],
    goldMin:740, goldMax:960, bossGateHP:0.8 },

  // ── BAND 46-50 ───────────────────────────────────────────────────────────

  { id:'hunt_soul_eaters',      band:'46-50', difficulty:'easy',   minLevel:46,
    name:'Hunt the Soul Eaters',
    flavor:'Hunt down the Soul Eaters consuming the last survivors in the fallen eastern cities.',
    enemies:[{enemyId:'soul_eater',isBoss:false},{enemyId:'soul_eater',isBoss:false},{enemyId:'abyss_crawler',isBoss:false}],
    goldMin:265, goldMax:340, bossGateHP:null },

  { id:'defend_final_gate',     band:'46-50', difficulty:'easy',   minLevel:46,
    name:'Defend the Final Gate',
    flavor:'Defend the Final Gate against the Void Wraith tide before the seal is spoken.',
    enemies:[{enemyId:'void_wraith',isBoss:false},{enemyId:'void_wraith',isBoss:false},{enemyId:'abyss_crawler',isBoss:false}],
    goldMin:270, goldMax:350, bossGateHP:null },

  { id:'clear_void_throne',     band:'46-50', difficulty:'medium', minLevel:46,
    name:'Clear the Void Throne',
    flavor:'Clear the Void Throne of the sovereign creatures that have claimed it in the darkness.',
    enemies:[{enemyId:'legendary_drake',isBoss:false},{enemyId:'wraith_sovereign',isBoss:false},{enemyId:'elder_void_stalker',isBoss:false}],
    goldMin:500, goldMax:650, bossGateHP:null },

  { id:'survive_archon_ritual', band:'46-50', difficulty:'medium', minLevel:46,
    name:'Survive the Archon Ritual',
    flavor:'Survive the Void Archon ritual before it tears the last rift open permanently.',
    enemies:[{enemyId:'dread_sovereign',isBoss:false},{enemyId:'void_archon',isBoss:false}],
    goldMin:520, goldMax:675, bossGateHP:null },

  { id:'slay_void_archon',      band:'46-50', difficulty:'hard',   minLevel:46,
    name:'Slay the Void Archon',
    flavor:'The world ends if you fail.  It has not ended yet.',
    enemies:[{enemyId:'eternal_golem',isBoss:false},{enemyId:'void_archon',isBoss:true}],
    goldMin:880, goldMax:1140, bossGateHP:0.8 },
];

// ============================================================
// EQUIPMENT DATA
// Slot types and materials for standard gear generation
// Unique items defined separately below
// ============================================================

const RPG_SLOT_TYPES = {
  weapon:     ['Sword','Axe','Spear','Hammer','Dagger','Greataxe','Mace'],
  shield:     ['Shield','Buckler','Kite Shield','Tower Shield','Targe'],
  helmet:     ['Helm','Hood','Coif','Crown','Visor','Circlet'],
  body_armor: ['Chestplate','Cuirass','Hauberk','Robe','Brigandine','Carapace'],
  boots:      ['Boots','Greaves','Sabatons','Treads','Wraps'],
  jewelry:    ['Ring','Amulet','Charm','Band','Pendant','Brooch','Talisman','Sigil'],
};

const RPG_BAND_MATERIALS = {
  '1-5':   ['Copper','Bone'],
  '6-10':  ['Iron','Tin'],
  '11-15': ['Bronze','Stone'],
  '16-20': ['Steel','Obsidian'],
  '21-25': ['Silver','Jade'],
  '26-30': ['Darkwood','Runic Iron'],
  '31-35': ['Mithril','Shadowsteel'],
  '36-40': ['Dawnsteel','Stormstone'],
  '41-45': ['Voidsteel','Soulforged'],
  '46-50': ['Void Crystal','Eternium'],
};

// Jewelry gem encodes attribute
const RPG_JEWELRY_GEMS = { STR:'Ruby', END:'Sapphire', AGI:'Emerald', DEX:'Amethyst' };

// Stat bonus per slot (standard gear — one bonus)
const RPG_SLOT_STAT = {
  weapon:     'STR',   // effective STR → ATK
  shield:     'END',   // effective END → DEF
  helmet:     'DEX',   // effective DEX → crit
  body_armor: 'END',   // effective END + flat HP
  boots:      'AGI',   // effective AGI → interval
  jewelry:    null,    // rolls one of STR/END/AGI/DEX + utility
};

// Gear scaling — base stat and per-tier increment by band index (0-9)
// stat value = bandBase[bandIdx] + (tier-1) × bandInc[bandIdx]
const RPG_GEAR_SCALE = {
  weapon:     { base:[3,5,7,10,13,17,22,28,35,43], inc:[2,2,3,3,4,4,5,5,6,7] },
  shield:     { base:[2,3,5,7,10,13,17,21,26,32],  inc:[1,1,2,2,3,3,4,4,5,5] },
  helmet:     { base:[2,3,5,7,10,13,17,21,26,32],  inc:[1,1,2,2,3,3,4,4,5,5] },
  body_armor: { base:[3,4,6,9,12,16,21,26,32,38],  inc:[1,1,2,2,3,3,4,4,5,6] },
  body_armor_hp:{ base:[5,7,10,13,17,22,28,35,43,52],inc:[2,2,2,3,3,4,4,5,6,7] },
  boots:      { base:[2,3,4,6,8,11,14,18,22,28],   inc:[1,1,1,2,2,2,3,3,3,4] },
  jewelry:    { base:[1,2,3,4,5,7,9,11,13,16],      inc:[1,1,1,2,2,2,2,3,3,4] },
};

// Tier thresholds
const RPG_TIER_SHOP_MAX  = 4;   // tiers above this never appear in shop
const RPG_TIER_QUEST_MIN = 5;   // tiers +5 and above are quest-only
const RPG_TIER_BOSS_MIN  = 8;   // tiers +8 and above are boss quest drops only

// Shop pricing: baseCost × 1.6^(tier-1) × (1 + bandIndex × 0.4)
function rpgItemPrice(tier, bandIndex) {
  return Math.round(20 * Math.pow(1.6, tier - 1) * (1 + bandIndex * 0.4));
}

// Sell value is 90% of buy price, always at least 1g
function rpgSellPrice(tier, bandIndex) {
  return Math.max(1, Math.floor(rpgItemPrice(tier, bandIndex) * 0.9));
}

// Tier quality indicator — ◆ per tier level, shown after item name
function rpgTierGlyphs(tier) {
  return '◆'.repeat(Math.min(Math.max(tier || 1, 1), 5));
}

// Unique item keyword pools (adjective-first format)
const RPG_UNIQUE_KEYWORDS = {
  STR: ['Crushing','Rending','Smashing','Wrathful','Cleaving','Ruinous','Breaching','Sundering'],
  AGI: ['Swift','Galeforce','Darting','Zephyr','Flash','Rushing','Blurring','Drifting'],
  DEX: ['True','Sharp','Piercing','Keen','Unerring','Exacting','Steady','Flint'],
  END: ['Fortified','Granite','Steadfast','Bastion','Rampart','Forged','Stalwart','Ironclad'],
};

// Unique item slot passives — scale by band group
// bandGroup: 0=bands 1-10, 1=bands 11-25, 2=bands 26-40, 3=bands 41-50
// Passive pools by item class
const RPG_WEAPON_PASSIVES  = ['lifesteal', 'haste', 'sharp_eye'];
const RPG_ARMOR_PASSIVES   = ['reflect', 'thorns', 'resilience'];

function rpgIsWeaponSlot(slot) { return slot === 'weapon'; }

// Compute passive value given type, bandGroup, and tier
function rpgPassiveValue(type, bandGroup, tier) {
  const bg = bandGroup;
  const t  = tier;
  const v = (base, inc) => Math.round(base + (t - 1) * inc);
  switch (type) {
    case 'lifesteal': {
      const base = [10,14,17,21][bg]; const inc = [0.8,0.9,1.0,1.0][bg];
      const pct = v(base, inc);
      return { type, pct, desc:`Lifesteal — heal ${pct}% of damage dealt per attack` };
    }
    case 'sharp_eye': {
      const base = [3,5,7,9][bg]; const inc = [0.4,0.5,0.5,0.5][bg];
      const pct = v(base, inc);
      return { type, pct, desc:`Sharp Eye — +${pct}% crit chance` };
    }
    case 'haste': {
      const base = [1,2,3,4][bg]; const inc = [0.2,0.2,0.2,0.2][bg];
      const ticks = Math.max(1, v(base, inc));
      return { type, ticks, desc:`Haste — -${ticks} tick${ticks>1?'s':''} attack interval` };
    }
    case 'reflect': {
      const cBase = [20,28,36,44][bg]; const cInc = [0.5,0.5,0.5,0.5][bg];
      const dBase = [24,40,60,80][bg]; const dInc = [2,3,4,5][bg];
      const chance = v(cBase, cInc); const dmgReduce = v(dBase, dInc);
      return { type, chance, dmgReduce, desc:`Reflect — ${chance}% chance to reduce incoming damage by ${dmgReduce}` };
    }
    case 'thorns': {
      const base = [6,9,12,15][bg]; const inc = [0.6,0.7,0.8,0.9][bg];
      const pct = v(base, inc);
      return { type, pct, desc:`Thorns — reflect ${pct}% of damage taken back to attacker` };
    }
    case 'resilience': {
      const base = [5,12,30,50][bg]; const inc = [1.0,1.8,3.0,4.0][bg];
      const hp = v(base, inc);
      return { type, hp, desc:`Resilience — +${hp} HP regen after each fight` };
    }
  }
}

// Roll a random passive for a unique item at drop time
function rpgUniquePassive(slot, bandGroup, tier) {
  const pool  = rpgIsWeaponSlot(slot) ? RPG_WEAPON_PASSIVES : RPG_ARMOR_PASSIVES;
  const type  = pool[Math.floor(Math.random() * pool.length)];
  return rpgPassiveValue(type, bandGroup, tier);
}

// Secondary stat per slot for unique items
const RPG_UNIQUE_SECONDARY = {
  weapon: 'END', shield: 'AGI', helmet: 'END',
  body_armor: 'DEX', boots: 'END', jewelry: 'END',
};

// Band index helper
function rpgBandIndex(band) {
  return ['1-5','6-10','11-15','16-20','21-25','26-30','31-35','36-40','41-45','46-50'].indexOf(band);
}

function rpgBandGroup(band) {
  const idx = rpgBandIndex(band);
  if (idx <= 1) return 0;
  if (idx <= 4) return 1;
  if (idx <= 7) return 2;
  return 3;
}

// Level → band
function rpgLevelBand(level) {
  if (level <= 5)  return '1-5';
  if (level <= 10) return '6-10';
  if (level <= 15) return '11-15';
  if (level <= 20) return '16-20';
  if (level <= 25) return '21-25';
  if (level <= 30) return '26-30';
  if (level <= 35) return '31-35';
  if (level <= 40) return '36-40';
  if (level <= 45) return '41-45';
  return '46-50';
}

// ============================================================
// RPG PROFILE HELPERS
// ============================================================

function rpgGetProfile() {
  const p = getProfile();   // calls main app getProfile()
  if (!p.rpg) {
    p.rpg = {
      gold: 0,
      currentHP: null,     // null = not yet initialised, set to maxHP on first load
      statBoost: null,
      goldStacks: 0,
      emberTonics: 1,      // default 1 charge (Apothecary level 0)
      castle: {
        barracks: 0, infirmary: 0, training_grounds: 0,
        vault: 0, watchtower: 0, trophy_hall: 0,
        apothecary: 0, forge: 0, market: 0,
      },
      equipped: {
        weapon: null, shield: null, helmet: null,
        body_armor: null, boots: null, jewelry: null,
      },
      materials: { copper:0, iron:0, mithril:0, darksteel:0, voidShards:0 },
      questRefresh: { cost:100, count:0, lastReset:null },
      cosmetics: {},
      shopPurchased: {},
      stats: {
        goldFromWorkouts: 0,
        goldFromBattles: 0,
        goldFromQuests: 0,
        goldFromAchievements: 0,
        goldFromPBs: 0,
        goldSpentShop: 0,
        goldSpentCastle: 0,
        battlesWon: 0,
        battlesLost: 0,
        questsCompleted: 0,
        enemiesDefeated: 0,
        bossesDefeated: 0,
        tonicsUsed: 0,
        itemsSold: 0,
        itemsSalvaged: 0,
        itemsBought: 0,
        totalDamageDealt: 0,
        totalDamageTaken: 0,
        biggestHit: 0,
        biggestHitTaken: 0,
        currentWinStreak: 0,
        longestWinStreak: 0,
        killCounts: {},
      },
    };
    saveProfile(p);
  }
  if (!p.rpg.stats) {
    p.rpg.stats = {
      goldFromWorkouts:0, goldFromBattles:0, goldFromQuests:0,
      goldFromAchievements:0, goldFromPBs:0, goldSpentShop:0, goldSpentCastle:0,
      battlesWon:0, battlesLost:0, questsCompleted:0,
      enemiesDefeated:0, bossesDefeated:0, tonicsUsed:0,
      itemsSold:0, itemsSalvaged:0, itemsBought:0,
      totalDamageDealt:0, totalDamageTaken:0,
      biggestHit:0, biggestHitTaken:0,
      currentWinStreak:0, longestWinStreak:0, killCounts:{},
    };
  } else {
    // Fill in any keys missing from older profiles
    const defaults = {
      goldFromWorkouts:0, goldFromBattles:0, goldFromQuests:0,
      goldFromAchievements:0, goldFromPBs:0, goldSpentShop:0, goldSpentCastle:0,
      battlesWon:0, battlesLost:0, questsCompleted:0,
      enemiesDefeated:0, bossesDefeated:0, tonicsUsed:0,
      itemsSold:0, itemsSalvaged:0, itemsBought:0,
      totalDamageDealt:0, totalDamageTaken:0,
      biggestHit:0, biggestHitTaken:0,
      currentWinStreak:0, longestWinStreak:0,
    };
    Object.entries(defaults).forEach(([k, v]) => {
      if (typeof p.rpg.stats[k] !== 'number') p.rpg.stats[k] = v;
    });
    if (!p.rpg.stats.killCounts) p.rpg.stats.killCounts = {};
  }
  return p;
}

function rpgSaveProfile(p) {
  saveProfile(p);   // delegates to main app saveProfile()
}
// ── Stat tracking helper ──────────────────────────────────────────────────────
function rpgStat(profile, key, amount) {
  if (!profile.rpg.stats) return;
  if (typeof profile.rpg.stats[key] !== 'number') profile.rpg.stats[key] = 0;
  profile.rpg.stats[key] += amount;
}
function rpgStatMax(profile, key, value) {
  if (!profile.rpg.stats) return;
  if (value > (profile.rpg.stats[key] || 0)) profile.rpg.stats[key] = value;
}
function rpgStatKill(profile, enemyId) {
  if (!profile.rpg.stats) return;
  if (!profile.rpg.stats.killCounts) profile.rpg.stats.killCounts = {};
  profile.rpg.stats.killCounts[enemyId] = (profile.rpg.stats.killCounts[enemyId] || 0) + 1;
}



function rpgGetInventory() {
  try { return JSON.parse(localStorage.getItem(RPG_INVENTORY_KEY) || '[]'); }
  catch { return []; }
}

function rpgSaveInventory(inv) {
  localStorage.setItem(RPG_INVENTORY_KEY, JSON.stringify(inv));
}

function rpgGetCombat() {
  try { return JSON.parse(localStorage.getItem(RPG_COMBAT_KEY) || 'null'); }
  catch { return null; }
}

function rpgSaveCombat(state) {
  if (state === null) { localStorage.removeItem(RPG_COMBAT_KEY); return; }
  localStorage.setItem(RPG_COMBAT_KEY, JSON.stringify(state));
}

// ── Player stat calculations ──────────────────────────────────────────────────

function rpgPlayerStats(profile) {
  const p = profile || rpgGetProfile();
  const { totalAttrXP } = computeAllXP(sessions);   // main app function
  const char = computeCharLevel(totalAttrXP);        // main app function
  const level = char.level;

  // Real attributes from workouts
  const realSTR = levelFromXP(totalAttrXP.str || 0).level;
  const realEND = levelFromXP(totalAttrXP.end || 0).level;
  const realAGI = levelFromXP(totalAttrXP.agi || 0).level;
  const realDEX = levelFromXP(totalAttrXP.dex || 0).level;

  // Effective attributes (real + gear bonuses)
  let gearSTR = 0, gearEND = 0, gearAGI = 0, gearDEX = 0, gearHP = 0;
  const equipped = p.rpg?.equipped || {};
  const inv = rpgGetInventory();

  Object.entries(equipped).forEach(([slot, item]) => {
    if (!item) return;
    const inst = inv.find(i => i.instanceId === item.instanceId);
    if (!inst?.rolledStats) return;
    const rs = inst.rolledStats;
    gearSTR += rs.effectiveSTR || 0;
    gearEND += rs.effectiveEND || 0;
    gearAGI += rs.effectiveAGI || 0;
    gearDEX += rs.effectiveDEX || 0;
    gearHP  += rs.flatHP || 0;
  });

  const effSTR = realSTR + gearSTR;
  const effEND = realEND + gearEND;
  const effAGI = realAGI + gearAGI;
  const effDEX = realDEX + gearDEX;

  // Castle bonuses
  const castle = p.rpg?.castle || {};
  const barracksBonus   = 1 + (castle.barracks || 0) * 0.03;
  const trainingBonus   = 1 + (castle.training_grounds || 0) * 0.10;

  // Derived stats
  const baseHP   = 200 + (effEND * 18) + (level * 10) + gearHP;
  const maxHP    = Math.round(baseHP * trainingBonus);
  const rawATK  = Math.round(effSTR * 3.2 * barracksBonus);
  const atk     = Math.max(10 + level, rawATK);
  const endMit  = effEND / (effEND + 300);
  const agiMit  = (effAGI * 0.5) / (effAGI + 100);
  const mitigation = Math.min(0.85, endMit + agiMit);  // hard cap at 85%
  const critChance = effDEX / (effDEX + 120);
  const interval = Math.max(4, 20 - Math.floor(effAGI / 8));

  return {
    level, realSTR, realEND, realAGI, realDEX,
    effSTR, effEND, effAGI, effDEX,
    gearSTR, gearEND, gearAGI, gearDEX, gearHP,
    maxHP, atk, mitigation, critChance, interval,
  };
}

// ── Enemy spawning ────────────────────────────────────────────────────────────

function rpgSpawnEnemy(enemyId, playerStats) {
  const def = RPG_ENEMIES.find(e => e.id === enemyId);
  if (!def) return null;
  const bp = BAND_POWER[def.band] || 100;
  const v1 = variance(), v2 = variance(), v3 = variance();
  return {
    id: def.id,
    name: def.name,
    band: def.band,
    tier: def.tier,
    flavor: def.flavor,
    maxHP:  Math.round(bp * def.hpMult * v1),
    currentHP: Math.round(bp * def.hpMult * v1),
    atk:    Math.round(bp * def.atkMult * v2),
    goldDrop: Math.round((def.goldMin + Math.random() * (def.goldMax - def.goldMin)) * v3),
    diffScore: def.diffScore,
    interval: spawnInterval(def.intervalType),
  };
}

// ── Enemies available at player level ────────────────────────────────────────

function rpgEnemiesForLevel(level, tier) {
  const band = rpgLevelBand(level);
  return RPG_ENEMIES.filter(e => e.band === band && e.tier === tier);
}

function rpgRandomEnemy(level, tier, playerStats) {
  const pool = rpgEnemiesForLevel(level, tier);
  if (!pool.length) return null;
  const def = pool[Math.floor(Math.random() * pool.length)];
  return rpgSpawnEnemy(def.id, playerStats);
}

// ── Quests available at player level ─────────────────────────────────────────

function rpgQuestsForLevel(level) {
  return RPG_QUESTS.filter(q => q.minLevel <= level && rpgLevelBand(level) === q.band);
}

// ── Gold from sessions (for retroactive award) ───────────────────────────────

function rpgGoldForSession(s) {
  // Half of composite XP earned from that session
  const { compositeXP } = computeSessionXP(s);   // main app function
  return Math.floor((compositeXP || 0) / 2);
}

// ── UUID generator ────────────────────────────────────────────────────────────

function rpgUUID() {
  return 'xxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
}

// ============================================================
// RPG HUB SCREEN
// ============================================================

function showRPGHub() {
  const profile = rpgGetProfile();
  const stats   = rpgPlayerStats(profile);
  const gold    = profile.rpg.gold || 0;
  const tonics  = profile.rpg.emberTonics ?? 0;
  const maxHP   = stats.maxHP;
  const curHP   = profile.rpg.currentHP ?? maxHP;

  // Initialise HP on first RPG load
  if (profile.rpg.currentHP === null) {
    profile.rpg.currentHP = maxHP;
    rpgSaveProfile(profile);
  }

  const hpPct = Math.round((curHP / maxHP) * 100);
  const hpColor = hpPct > 60 ? '#4CAF50' : hpPct > 30 ? '#FFA726' : '#EF5350';
  const apothecary = profile.rpg.castle?.apothecary || 0;
  const tonicMax = 1 + apothecary;
  const forgeLvl = profile.rpg.castle?.forge || 0;

  const html = `
  <!-- Topbar -->
  <div style="
    display:flex;align-items:center;justify-content:space-between;
    padding:14px 16px 10px;border-bottom:1px solid var(--border);
    position:sticky;top:0;background:var(--bg);z-index:10;
  ">
    <button onclick="closeRPG()" style="background:none;border:none;color:var(--text-muted);font-family:'DM Mono',monospace;font-size:13px;cursor:pointer;padding:0;">← Training</button>
    <span style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:var(--str);letter-spacing:0.08em">THE REALM</span>
    <div style="width:70px"></div>
  </div>

  <!-- Character Card -->
  <div onclick="showRPGCharacterSheet()" style="
    margin:16px;background:var(--card);border:1px solid var(--border);
    border-radius:10px;padding:14px 16px;cursor:pointer;
  ">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
      <div>
        <div style="font-size:15px;font-weight:500">${profile.name || 'Athlete'}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${profile.equippedTitle || 'Newcomer'}</div>
      </div>
      <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:var(--str)">Lv ${stats.level}</div>
    </div>
    <div style="margin-bottom:6px">
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted);margin-bottom:3px">
        <span>HP</span><span>${curHP} / ${maxHP}</span>
      </div>
      <div style="background:var(--border);border-radius:3px;height:6px;overflow:hidden">
        <div style="width:${hpPct}%;height:100%;background:${hpColor};border-radius:3px;transition:width 1.5s ease"></div>
      </div>
    </div>
    <div style="display:flex;gap:12px;margin-top:8px">
      ${[['STR',stats.realSTR,'#E57373'],['END',stats.realEND,'#64B5F6'],['AGI',stats.realAGI,'#81C784'],['DEX',stats.realDEX,'#CE93D8']].map(([label,val,col])=>`
        <div style="text-align:center">
          <div style="font-size:9px;color:${col};margin-bottom:1px">${label}</div>
          <div style="font-size:13px;font-weight:500">${val}</div>
        </div>
      `).join('')}
    </div>
  </div>

  <!-- Destination Grid — 2×3, Forge unlocks after first upgrade -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:0 16px;">
    ${[
      ['⚔️','The Wilds','Field · Forest · Castle','showRPGWilds()',false],
      ['📋','Quest Board','Active quests','showRPGQuestBoard()',false],
      ['🏰','The Castle','Upgrades & buildings','showRPGCastle()',false],
      ['🛒','Shop','Buy gear & tonics','showRPGShop()',false],
      forgeLvl > 0
        ? ['🔨','Forge','Upgrade your gear','showRPGForge()',false]
        : ['🔨','Forge','Upgrade the Forge building to unlock','',true],
      ['👤','Character','Stats · Inventory','showRPGCharacterSheet()',false],
    ].filter(Boolean).map(([icon,title,sub,fn,locked])=>`
      <div onclick="${locked ? '' : fn}" style="
        background:var(--card);
        border:1px solid ${locked ? 'var(--border)' : 'var(--border)'};
        border-radius:10px;
        padding:16px 14px;cursor:${locked ? 'default' : 'pointer'};
        display:flex;flex-direction:column;gap:6px;min-height:90px;
        opacity:${locked ? '0.4' : '1'};
      ">
        <div style="font-size:22px">${icon}</div>
        <div style="font-size:13px;font-weight:500">${title}</div>
        <div style="font-size:10px;color:var(--text-muted)">${sub}</div>
      </div>
    `).join('')}
  </div>

  <!-- Status Line -->
  <div style="display:flex;justify-content:space-around;padding:14px 16px;border-top:1px solid var(--border);margin-top:16px;">
    <div style="text-align:center">
      <div style="font-size:10px;color:var(--text-muted);margin-bottom:2px">GOLD</div>
      <div style="font-size:15px;font-weight:500;color:#FFA726">${gold.toLocaleString()}g</div>
    </div>
    <div style="text-align:center">
      <div style="font-size:10px;color:var(--text-muted);margin-bottom:6px">EMBER TONICS</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:6px">
        ${Array.from({length: tonicMax}, (_,i) => {
          const full = i < tonics;
          return `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${full ? 'var(--str)' : '#2A2018'};border:1px solid ${full ? 'var(--str)' : '#3A3020'};${full ? 'box-shadow:0 0 6px 2px rgba(196,115,42,0.8),0 0 14px 4px rgba(196,115,42,0.4);' : ''}"></span>`;
        }).join('')}
      </div>
      <div style="font-size:10px;color:var(--text-muted);margin-top:4px">${tonics} / ${tonicMax}</div>
    </div>
  </div>`;

  // Use the app's screen pattern
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const body = document.getElementById('rpg-screen-body');
  if (body) body.innerHTML = html;
  const screen = document.getElementById('screen-rpg');
  if (screen) screen.classList.add('active');
}

// ── Stub screens (Phase 1+ will implement these) ──────────────────────────────

// ============================================================
// PHASE 2 — CHARACTER SHEET
// ============================================================

// ── Item helpers ─────────────────────────────────────────────────────────────

function rpgSalvageYield(tier) {
  // Fixed qty — no randomness so the confirmation display always matches what you receive
  if (tier <= 2) return { material:'copper',    qty: 1 };
  if (tier <= 4) return { material:'iron',      qty: 1 };
  if (tier <= 6) return { material:'mithril',   qty: 1 };
  if (tier <= 8) return { material:'darksteel', qty: 1 };
  return { material:'darksteel', qty:1, voidShardChance:true };
}

function rpgSalvageYieldUnique() {
  return { material:'voidShards', qty:1 };
}

function rpgMaterialLabel(mat) {
  const labels = {
    copper:'Copper Bar', iron:'Iron Bar', mithril:'Mithril Bar',
    darksteel:'Darksteel Bar', voidShards:'Void Shard',
  };
  return labels[mat] || mat;
}

function rpgStatLabel(stat) {
  return { STR:'Strength', END:'Endurance', AGI:'Agility', DEX:'Dexterity' }[stat] || stat;
}

function rpgSlotLabel(slot) {
  return { weapon:'Weapon', shield:'Shield', helmet:'Helmet',
    body_armor:'Body Armor', boots:'Boots', jewelry:'Jewelry' }[slot] || slot;
}

function rpgSlotIcon(slot) {
  return { weapon:'⚔️', shield:'🛡️', helmet:'🪖', body_armor:'🧥', boots:'👢', jewelry:'💍' }[slot] || '📦';
}

// Compute rolled stat value for an instance (for display)
function rpgItemStatDisplay(inst) {
  if (!inst) return '';
  if (inst.rolledStats) {
    const rs = inst.rolledStats;
    const parts = [];
    if (rs.effectiveSTR) parts.push(`+${rs.effectiveSTR} STR`);
    if (rs.effectiveEND) parts.push(`+${rs.effectiveEND} END`);
    if (rs.effectiveAGI) parts.push(`+${rs.effectiveAGI} AGI`);
    if (rs.effectiveDEX) parts.push(`+${rs.effectiveDEX} DEX`);
    if (rs.flatHP)       parts.push(`+${rs.flatHP} HP`);
    return parts.join('  ');
  }
  return '';
}

// ── Bottom sheet system ───────────────────────────────────────────────────────

function rpgShowSheet(html) {
  let overlay = document.getElementById('rpg-sheet-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'rpg-sheet-overlay';
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:1000;
      background:rgba(0,0,0,0.6);
      display:flex;align-items:flex-end;
    `;
    overlay.onclick = (e) => { if (e.target === overlay) rpgDismissSheet(); };
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `
    <div style="
      width:100%;max-height:85vh;overflow-y:auto;
      background:var(--card);
      border-radius:16px 16px 0 0;
      padding:0 0 40px;
      font-family:'DM Mono',monospace;
    ">
      <div style="width:40px;height:4px;background:var(--border);border-radius:2px;margin:12px auto 0"></div>
      ${html}
    </div>`;
  overlay.style.display = 'flex';
}

function rpgDismissSheet() {
  const overlay = document.getElementById('rpg-sheet-overlay');
  if (overlay) overlay.style.display = 'none';
}

// ── Item detail sheet ─────────────────────────────────────────────────────────
// context: 'equipped' | 'inventory'
// slot: the equipment slot key
// instanceId: the item's UUID (null if slot is empty)

function rpgShowItemSheet(instanceId, slot, context) {
  const inv = rpgGetInventory();
  const inst = inv.find(i => i.instanceId === instanceId);
  const profile = rpgGetProfile();

  if (!inst) {
    // Empty slot — navigate to filtered inventory
    showRPGCharacterSheet('inventory', slot);
    return;
  }

  const price    = rpgSellPrice(inst.tier, rpgBandIndex(inst.band || '1-5'));
  const salvage  = inst.isUnique ? rpgSalvageYieldUnique() : rpgSalvageYield(inst.tier);
  const isFav    = inst.favorite || false;
  const statLine = rpgItemStatDisplay(inst);
  const isEquipped = context === 'equipped';

  let passiveLine = '';
  if (inst.isUnique && inst.passive) {
    passiveLine = `<div style="font-size:11px;color:var(--str);margin-top:6px">✦ ${inst.passive.desc}</div>`;
  }

  // ── Stat comparison (inventory items only) ────────────────────────────────
  let comparisonHtml = '';
  if (!isEquipped) {
    const equipped = profile.rpg.equipped || {};
    const eqRef = equipped[inst.slot];
    const eqInst = eqRef ? inv.find(i => i.instanceId === eqRef.instanceId) : null;

    const statKeys = ['effectiveSTR','effectiveEND','effectiveAGI','effectiveDEX','flatHP'];
    const statNames = { effectiveSTR:'STR', effectiveEND:'END', effectiveAGI:'AGI', effectiveDEX:'DEX', flatHP:'HP' };

    const thisStats  = inst.rolledStats || {};
    const eqStats    = eqInst?.rolledStats || {};

    // Collect all stat keys present in either item
    const allKeys = [...new Set([...Object.keys(thisStats), ...Object.keys(eqStats)])].filter(k => statKeys.includes(k));

    if (allKeys.length > 0) {
      let rows = allKeys.map(k => {
        const thisVal = thisStats[k] || 0;
        const eqVal   = eqStats[k]   || 0;
        const delta   = thisVal - eqVal;
        const deltaColor = delta > 0 ? '#4CAF50' : delta < 0 ? '#EF5350' : 'var(--text-muted)';
        const deltaStr = delta === 0 ? '—' : (delta > 0 ? `+${delta}` : `${delta}`);
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-top:1px solid var(--border)">
          <span style="font-size:11px;color:var(--text-muted)">${statNames[k]}</span>
          <div style="display:flex;align-items:center;gap:12px">
            <span style="font-size:12px">${thisVal}</span>
            <span style="font-size:11px;color:${deltaColor};min-width:28px;text-align:right">${deltaStr}</span>
          </div>
        </div>`;
      }).join('');

      const eqLabel = eqInst
        ? `vs. ${eqInst.name} +${eqInst.tier}`
        : `vs. [empty slot]`;

      // Passive comparison for uniques
      let passiveComp = '';
      if (inst.isUnique && inst.passive) {
        const eqPassive = eqInst?.isUnique && eqInst?.passive ? eqInst.passive.desc : null;
        passiveComp = `<div style="padding:7px 0;border-top:1px solid var(--border)">
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:3px">PASSIVE</div>
          <div style="font-size:11px;color:var(--str)">${inst.passive.desc}</div>
          ${eqPassive ? `<div style="font-size:10px;color:var(--text-muted);margin-top:4px">Replaces: ${eqPassive}</div>` : ''}
        </div>`;
      }

      comparisonHtml = `
        <div style="padding:12px 20px 0">
          <div style="font-size:10px;color:var(--text-muted);letter-spacing:0.05em;margin-bottom:6px">COMPARISON — ${eqLabel}</div>
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:0 12px">
            ${rows}
            ${passiveComp}
          </div>
        </div>`;
    }
  }

  const actionsHtml = isEquipped
    ? `<button onclick="rpgUnequipItem('${slot}')" style="${rpgBtnStyle('var(--border)')}">Unequip</button>`
    : `<button onclick="rpgEquipItem('${instanceId}')" style="${rpgBtnStyle('var(--str)')}">Equip</button>
       <button onclick="rpgConfirmSell('${instanceId}',${price})" style="${rpgBtnStyle('#4CAF50')}">Sell ${price}g</button>
       <button onclick="rpgConfirmSalvage('${instanceId}')" style="${rpgBtnStyle('#FFA726')}">Salvage → ${salvage.qty}× ${rpgMaterialLabel(salvage.material)}</button>`;

  rpgShowSheet(`
    <div style="padding:20px 20px 8px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="font-size:15px;font-weight:500;color:var(--text)">${inst.name || 'Unknown Item'} <span style="color:var(--text-muted);font-size:11px">${rpgTierGlyphs(inst.tier)}</span> +${inst.tier}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:3px">${rpgSlotLabel(inst.slot)} · ${inst.band || ''} band</div>
        </div>
        <button onclick="rpgToggleFavorite('${instanceId}')" style="
          background:${isFav ? 'rgba(255,180,0,0.15)' : 'var(--surface)'};
          border:1px solid ${isFav ? '#FFA726' : 'var(--border)'};
          border-radius:8px;cursor:pointer;
          font-size:18px;padding:6px 10px;line-height:1;
          color:${isFav ? '#FFA726' : 'var(--text-muted)'};
        ">${isFav ? '★' : '☆'}</button>
      </div>
      <div style="margin-top:12px;font-size:13px;color:var(--str)">${statLine}</div>
      ${passiveLine}
      ${inst.isUnique ? '<div style="font-size:10px;color:var(--dex);margin-top:6px;letter-spacing:0.05em">UNIQUE ITEM</div>' : ''}
    </div>
    ${comparisonHtml}
    <div style="border-top:1px solid var(--border);padding:16px 20px;display:flex;flex-direction:column;gap:10px;margin-top:12px">
      ${actionsHtml}
    </div>`);
}

function rpgBtnStyle(borderColor) {
  return `width:100%;padding:12px;background:none;border:1px solid ${borderColor};
    border-radius:8px;color:var(--text);font-family:'DM Mono',monospace;
    font-size:13px;cursor:pointer;text-align:left;`;
}

// ── Confirm steps ─────────────────────────────────────────────────────────────

function rpgConfirmSell(instanceId, price) {
  const inv = rpgGetInventory();
  const inst = inv.find(i => i.instanceId === instanceId);
  if (!inst) return;
  rpgShowSheet(`
    <div style="padding:24px 20px;text-align:center">
      <div style="font-size:15px;font-weight:500;margin-bottom:6px">Sell ${inst.name} ${rpgTierGlyphs(inst.tier)} +${inst.tier}?</div>
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:24px">You will receive <span style="color:#FFA726">${price}g</span>. This cannot be undone.</div>
      <div style="display:flex;gap:12px">
        <button onclick="rpgDismissSheet()" style="${rpgBtnStyle('var(--border)')}text-align:center;">Cancel</button>
        <button onclick="rpgExecuteSell('${instanceId}',${price})" style="${rpgBtnStyle('#4CAF50')}text-align:center;color:#4CAF50;">Confirm Sell</button>
      </div>
    </div>`);
}

function rpgConfirmSalvage(instanceId) {
  const inv = rpgGetInventory();
  const inst = inv.find(i => i.instanceId === instanceId);
  if (!inst) return;
  const salvage = inst.isUnique ? rpgSalvageYieldUnique() : rpgSalvageYield(inst.tier);
  rpgShowSheet(`
    <div style="padding:24px 20px;text-align:center">
      <div style="font-size:15px;font-weight:500;margin-bottom:6px">Salvage ${inst.name} ${rpgTierGlyphs(inst.tier)} +${inst.tier}?</div>
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:24px">You will receive <span style="color:#FFA726">${salvage.qty}× ${rpgMaterialLabel(salvage.material)}</span>. This cannot be undone.</div>
      <div style="display:flex;gap:12px">
        <button onclick="rpgDismissSheet()" style="${rpgBtnStyle('var(--border)')}text-align:center;">Cancel</button>
        <button onclick="rpgExecuteSalvage('${instanceId}')" style="${rpgBtnStyle('#FFA726')}text-align:center;color:#FFA726;">Confirm Salvage</button>
      </div>
    </div>`);
}

// ── Item actions ──────────────────────────────────────────────────────────────

function rpgEquipItem(instanceId) {
  const inv = rpgGetInventory();
  const inst = inv.find(i => i.instanceId === instanceId);
  if (!inst) return;
  const profile = rpgGetProfile();
  const slot = inst.slot;
  // Return currently equipped item to inventory (it's already in inv array — just clear equipped)
  profile.rpg.equipped[slot] = { instanceId: inst.instanceId, slot };
  rpgSaveProfile(profile);
  rpgDismissSheet();
  showRPGCharacterSheet('stats');
}

function rpgUnequipItem(slot) {
  const profile = rpgGetProfile();
  profile.rpg.equipped[slot] = null;
  rpgSaveProfile(profile);
  rpgDismissSheet();
  showRPGCharacterSheet('stats');
}

function rpgToggleFavorite(instanceId) {
  const inv = rpgGetInventory();
  const inst = inv.find(i => i.instanceId === instanceId);
  if (!inst) return;
  inst.favorite = !inst.favorite;
  rpgSaveInventory(inv);

  // Update the star button in-place — no sheet rebuild so action buttons stay visible
  const btn = document.querySelector(`[onclick="rpgToggleFavorite('${instanceId}')"]`);
  if (btn) {
    const isFav = inst.favorite;
    btn.style.background   = isFav ? 'rgba(255,180,0,0.15)' : 'var(--surface)';
    btn.style.borderColor  = isFav ? '#FFA726' : 'var(--border)';
    btn.style.color        = isFav ? '#FFA726' : 'var(--text-muted)';
    btn.textContent        = isFav ? '★' : '☆';
  }

  // Refresh character sheet if visible
  const screenBody = document.getElementById('rpg-screen-body');
  if (screenBody && (screenBody.innerHTML.includes('cs-tab-inv') ||
      screenBody.innerHTML.includes('cs-tab-stats'))) {
    showRPGCharacterSheet(
      screenBody.innerHTML.includes('rpgstats') ? 'rpgstats' :
      screenBody.innerHTML.includes('inventory') ? 'inventory' : 'stats'
    );
  }
}

function rpgExecuteSell(instanceId, price) {
  const inv = rpgGetInventory();
  const idx = inv.findIndex(i => i.instanceId === instanceId);
  if (idx < 0) return;
  inv.splice(idx, 1);
  rpgSaveInventory(inv);
  const profile = rpgGetProfile();
  profile.rpg.gold = (profile.rpg.gold || 0) + price;
  rpgStat(profile, 'itemsSold', 1);
  rpgSaveProfile(profile);
  rpgDismissSheet();
  showRPGCharacterSheet('inventory');
}

function rpgExecuteSalvage(instanceId) {
  const inv = rpgGetInventory();
  const inst = inv.find(i => i.instanceId === instanceId);
  if (!inst) return;
  const salvage = inst.isUnique ? rpgSalvageYieldUnique() : rpgSalvageYield(inst.tier);
  const idx = inv.findIndex(i => i.instanceId === instanceId);
  inv.splice(idx, 1);
  rpgSaveInventory(inv);
  const profile = rpgGetProfile();
  if (!profile.rpg.materials) profile.rpg.materials = { copper:0, iron:0, mithril:0, darksteel:0, voidShards:0 };
  profile.rpg.materials[salvage.material] = (profile.rpg.materials[salvage.material] || 0) + salvage.qty;
  rpgStat(profile, 'itemsSalvaged', 1);
  rpgSaveProfile(profile);
  rpgDismissSheet();
  showRPGCharacterSheet('inventory');
}

// ── RPG Stats tab builder ─────────────────────────────────────────────────────
function buildRPGStatsTab(profile, inv) {
  const st = profile.rpg.stats || {};
  const castle = profile.rpg.castle || {};

  // Compute total gold ever earned
  const totalGoldEarned = (st.goldFromWorkouts||0) + (st.goldFromBattles||0) +
    (st.goldFromQuests||0) + (st.goldFromAchievements||0) + (st.goldFromPBs||0);

  // Win rate
  const totalFights = (st.battlesWon||0) + (st.battlesLost||0);
  const winRate = totalFights > 0 ? Math.round((st.battlesWon||0) / totalFights * 100) : 0;

  // Most killed enemy
  const killCounts = st.killCounts || {};
  const topKills = Object.entries(killCounts)
    .sort((a,b) => b[1]-a[1]).slice(0,3)
    .map(([id,n]) => {
      const def = RPG_ENEMIES.find(e => e.id === id);
      return `${def?.name || id} ×${n}`;
    });

  // Most upgraded building
  const topBuilding = Object.entries(castle)
    .filter(([k]) => RPG_CASTLE_BUILDINGS.find(b => b.id === k))
    .sort((a,b) => b[1]-a[1])[0];
  const topBuildingLabel = topBuilding
    ? `${RPG_CASTLE_BUILDINGS.find(b=>b.id===topBuilding[0])?.name} (Lv ${topBuilding[1]})`
    : 'None yet';

  // Items in inventory by slot
  const slotCounts = {};
  inv.forEach(i => { slotCounts[i.slot] = (slotCounts[i.slot]||0) + 1; });

  const row = (label, value, col='var(--text)') =>
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-top:1px solid var(--border)">
      <span style="font-size:11px;color:var(--text-muted)">${label}</span>
      <span style="font-size:12px;font-weight:500;color:${col}">${value}</span>
    </div>`;

  const section = (title, rows) =>
    `<div style="margin:16px 16px 0">
      <div style="font-size:10px;color:var(--text-muted);letter-spacing:0.05em;margin-bottom:6px">${title}</div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden">
        ${rows}
      </div>
    </div>`;

  return `
    ${section('⚔️ GOLD', `
      ${row('Total ever earned', totalGoldEarned.toLocaleString()+'g', '#FFA726')}
      ${row('Currently held', (profile.rpg.gold||0).toLocaleString()+'g', '#FFA726')}
      ${row('From workouts', (st.goldFromWorkouts||0).toLocaleString()+'g')}
      ${row('From battles', (st.goldFromBattles||0).toLocaleString()+'g')}
      ${row('From quests', (st.goldFromQuests||0).toLocaleString()+'g')}
      ${row('From achievements', (st.goldFromAchievements||0).toLocaleString()+'g')}
      ${row('From personal bests', (st.goldFromPBs||0).toLocaleString()+'g')}
      ${row('Spent in shop', (st.goldSpentShop||0).toLocaleString()+'g')}
      ${row('Spent on castle', (st.goldSpentCastle||0).toLocaleString()+'g')}
    `)}

    ${section('⚔️ COMBAT', `
      ${row('Battles won', (st.battlesWon||0).toLocaleString(), '#4CAF50')}
      ${row('Battles lost', (st.battlesLost||0).toLocaleString(), '#EF5350')}
      ${row('Win rate', totalFights > 0 ? winRate+'%' : '—')}
      ${row('Quests completed', (st.questsCompleted||0).toLocaleString(), 'var(--str)')}
      ${row('Enemies defeated', (st.enemiesDefeated||0).toLocaleString())}
      ${row('Bosses defeated', (st.bossesDefeated||0).toLocaleString(), 'var(--str)')}
      ${row('Current win streak', (st.currentWinStreak||0).toLocaleString())}
      ${row('Longest win streak', (st.longestWinStreak||0).toLocaleString(), 'var(--str)')}
    `)}

    ${section('⚔️ DAMAGE', `
      ${row('Total damage dealt', (st.totalDamageDealt||0).toLocaleString())}
      ${row('Total damage taken', (st.totalDamageTaken||0).toLocaleString())}
      ${row('Biggest single hit', (st.biggestHit||0).toLocaleString(), '#4CAF50')}
      ${row('Biggest hit taken', (st.biggestHitTaken||0).toLocaleString(), '#EF5350')}
      ${row('Ember Tonics used', (st.tonicsUsed||0).toLocaleString())}
    `)}

    ${section('⚔️ TOP KILLS', `
      ${topKills.length
        ? topKills.map((k,i) => row(`#${i+1}`, k)).join('')
        : row('No kills yet', '—')}
    `)}

    ${section('⚔️ ITEMS', `
      ${row('Items in inventory', inv.length.toLocaleString())}
      ${row('Favorited', inv.filter(i=>i.favorite).length.toLocaleString(), '#FFA726')}
      ${row('Items bought', (st.itemsBought||0).toLocaleString())}
      ${row('Items sold', (st.itemsSold||0).toLocaleString())}
      ${row('Items salvaged', (st.itemsSalvaged||0).toLocaleString())}
      ${row('Most upgraded building', topBuildingLabel)}
    `)}
  `;
}



function showRPGCharacterSheet(activeTab, filterSlot) {
  activeTab = activeTab || 'stats';
  const profile  = rpgGetProfile();
  const stats    = rpgPlayerStats(profile);
  const inv      = rpgGetInventory();
  const equipped = profile.rpg.equipped || {};
  // ── Stats tab ────────────────────────────────────────────────────────────
  function buildStatsTab() {
    const slots = ['weapon','shield','helmet','body_armor','boots','jewelry'];

    // Attribute rows
    const attrRows = [
      ['STR', stats.realSTR, stats.gearSTR, stats.effSTR, '#E57373'],
      ['END', stats.realEND, stats.gearEND, stats.effEND, '#64B5F6'],
      ['AGI', stats.realAGI, stats.gearAGI, stats.effAGI, '#81C784'],
      ['DEX', stats.realDEX, stats.gearDEX, stats.effDEX, '#CE93D8'],
    ];

    // Active passives from equipped unique items
    const ap = rpgComputeActivePassives(profile);

    // HP regen per workout (infirmary + resilience passive)
    const infirmaryLvl = profile.rpg.castle?.infirmary || 0;
    const infirmaryAmt = infirmaryLvl > 0 ? Math.round(stats.maxHP * infirmaryLvl * 0.03) : 0;
    const resilienceAmt = ap.resilience ? ap.resilience.hp : 0;
    const totalRegen = infirmaryAmt + resilienceAmt;

    // Build derived stat rows — always show base stats, show passives only if present
    const derivedRows = [
      ['ATK',            stats.atk,                                         'var(--text)'],
      ['HP',             stats.maxHP,                                        'var(--text)'],
      ...(stats.gearHP > 0 ? [['  ↳ Gear HP bonus', '+' + stats.gearHP, '#FFA726']] : []),
      ['HP Regen / workout', totalRegen > 0
        ? totalRegen + (infirmaryAmt > 0 && resilienceAmt > 0
            ? ` (${infirmaryAmt} infirmary + ${resilienceAmt} resilience)`
            : infirmaryAmt > 0 ? ' (infirmary)' : ' (resilience)')
        : '—',                                                               totalRegen > 0 ? '#4CAF50' : 'var(--text-muted)'],
      ['DEF mitigation', Math.round(stats.mitigation * 100) + '%',          'var(--text)'],
      ['Crit chance',    ap.sharp_eye
        ? Math.round(stats.critChance * 100) + '% (+' + ap.sharp_eye.pct + '% passive)'
        : Math.round(stats.critChance * 100) + '%',                         'var(--text)'],
      ['Attack interval', ap.haste
        ? stats.interval + ' ticks (−' + ap.haste.ticks + ' from passive)'
        : stats.interval + ' ticks',                                        'var(--text)'],
      ...(ap.lifesteal ? [['Lifesteal',  ap.lifesteal.pct + '% of dmg dealt', '#CE93D8']] : []),
      ...(ap.thorns    ? [['Thorns',     ap.thorns.pct + '% reflected',       '#CE93D8']] : []),
      ...(ap.reflect   ? [['Reflect',    ap.reflect.chance + '% chance / −' + ap.reflect.dmgReduce + ' dmg', '#CE93D8']] : []),
    ];

    let html = `
      <!-- Header -->
      <div style="padding:16px 16px 8px;text-align:center">
        <div style="font-size:16px;font-weight:500">${profile.name || 'Athlete'}</div>
        <div style="font-size:11px;color:var(--str);margin-top:2px">${profile.equippedTitle || 'Newcomer'} · Lv ${stats.level}</div>
      </div>

      <!-- Attributes -->
      <div style="margin:0 16px;background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;font-size:9px;color:var(--text-muted);padding:8px 12px 4px;letter-spacing:0.05em">
          <span>ATTR</span><span style="text-align:right">REAL</span><span style="text-align:right">GEAR</span><span style="text-align:right">EFF</span>
        </div>
        ${attrRows.map(([label, real, gear, eff, col]) => `
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;padding:8px 12px;border-top:1px solid var(--border)">
            <span style="font-size:12px;color:${col}">${label}</span>
            <span style="font-size:12px;text-align:right">${real}</span>
            <span style="font-size:12px;text-align:right;color:${gear > 0 ? '#FFA726' : 'var(--text-muted)'}">${gear > 0 ? '+'+gear : '—'}</span>
            <span style="font-size:13px;font-weight:500;text-align:right;color:${col}">${eff}</span>
          </div>`).join('')}
      </div>

      <!-- Derived stats -->
      <div style="margin:12px 16px;background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden">
        ${derivedRows.map(([label, val, col]) => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 12px;border-top:1px solid var(--border)">
            <span style="font-size:11px;color:var(--text-muted)">${label}</span>
            <span style="font-size:12px;font-weight:500;color:${col}">${val}</span>
          </div>`).join('')}
      </div>

      <!-- Equipped gear — paper doll -->
      <div style="margin:0 16px 8px;font-size:10px;color:var(--text-muted);letter-spacing:0.05em">EQUIPPED GEAR</div>
      <div style="margin:0 16px;display:flex;flex-direction:column;gap:8px">
        ${slots.map(slot => {
          const eq = equipped[slot];
          const inst = eq ? inv.find(i => i.instanceId === eq.instanceId) : null;
          const label = rpgSlotLabel(slot);
          const icon  = rpgSlotIcon(slot);
          const statLine = inst ? rpgItemStatDisplay(inst) : '';
          return `<div onclick="rpgShowItemSheet(${inst ? "'"+inst.instanceId+"'" : 'null'},'${slot}','equipped')" style="
            background:var(--surface);border:1px solid ${inst ? 'var(--border)' : 'var(--border)'};
            border-radius:8px;padding:10px 12px;cursor:pointer;
            display:flex;align-items:center;justify-content:space-between;
          ">
            <div style="display:flex;align-items:center;gap:10px">
              <span style="font-size:16px">${icon}</span>
              <div>
                <div style="font-size:10px;color:var(--text-muted)">${label}</div>
                <div style="font-size:13px;color:${inst ? 'var(--text)' : 'var(--text-muted)'}">
                  ${inst ? (inst.name + ' ' + rpgTierGlyphs(inst.tier) + ' +' + inst.tier) : '[empty]'}
                  ${inst?.favorite ? ' ⭐' : ''}
                </div>
                ${statLine ? `<div style="font-size:10px;color:var(--str);margin-top:1px">${statLine}</div>` : ''}
              </div>
            </div>
            <span style="color:var(--text-muted);font-size:16px">›</span>
          </div>`;
        }).join('')}
      </div>`;
    return html;
  }

  // ── Inventory tab ────────────────────────────────────────────────────────
  function buildInventoryTab() {
    const slots = ['weapon','shield','helmet','body_armor','boots','jewelry'];
    const materials = profile.rpg.materials || {};
    const matTotal = Object.values(materials).reduce((a, b) => a + b, 0);

    // Build set of equipped instanceIds for quick lookup
    const equippedIds = new Set(
      Object.values(equipped).filter(Boolean).map(e => e.instanceId)
    );

    // Sort inventory: favorites first within each slot, then by tier desc
    const sortedInv = [...inv].sort((a, b) => {
      if (b.favorite && !a.favorite) return 1;
      if (a.favorite && !b.favorite) return -1;
      return b.tier - a.tier;
    });

    let html = '';

    slots.forEach(slot => {
      const items = sortedInv.filter(i => i.slot === slot);
      const isFiltered = filterSlot === slot;
      const open = isFiltered || items.length > 0;

      html += `
        <div style="margin:0 16px 8px">
          <div onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'"
            style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;padding:8px 0">
            <span style="font-size:11px;color:var(--text-muted);letter-spacing:0.05em">${rpgSlotIcon(slot)} ${rpgSlotLabel(slot).toUpperCase()} (${items.length})</span>
            <span style="color:var(--text-muted);font-size:12px">${open ? '▾' : '▸'}</span>
          </div>
          <div style="display:${open ? 'block' : 'none'}">
            ${items.length === 0
              ? `<div style="font-size:12px;color:var(--text-muted);padding:8px 0;font-style:italic">No items</div>`
              : items.map(inst => {
                  const statLine  = rpgItemStatDisplay(inst);
                  const isEquipped = equippedIds.has(inst.instanceId);
                  return `<div onclick="rpgShowItemSheet('${inst.instanceId}','${inst.slot}','inventory')" style="
                    background:var(--surface);
                    border:1px solid ${isEquipped ? 'var(--str)' : 'var(--border)'};
                    border-radius:8px;
                    padding:10px 12px;margin-bottom:6px;cursor:pointer;
                    display:flex;align-items:center;justify-content:space-between;
                  ">
                    <div>
                      <div style="font-size:13px">
                        ${inst.name} <span style="color:var(--text-muted);font-size:10px">${rpgTierGlyphs(inst.tier)}</span> +${inst.tier}${inst.favorite ? ' ⭐' : ''}${inst.isUnique ? ' ✦' : ''}
                        ${isEquipped ? '<span style="font-size:10px;color:var(--str);background:var(--str)22;padding:1px 6px;border-radius:3px;margin-left:6px;vertical-align:middle">equipped</span>' : ''}
                      </div>
                      <div style="font-size:10px;color:var(--str);margin-top:2px">${statLine}</div>
                    </div>
                    <span style="color:var(--text-muted);font-size:16px">›</span>
                  </div>`;
                }).join('')
            }
          </div>
        </div>`;
    });

    // Materials section
    html += `
      <div style="margin:0 16px 8px">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0">
          <span style="font-size:11px;color:var(--text-muted);letter-spacing:0.05em">🪨 MATERIALS (${matTotal})</span>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;overflow:hidden">
          ${[
            ['copper',    'Copper Bar',    materials.copper    || 0],
            ['iron',      'Iron Bar',      materials.iron      || 0],
            ['mithril',   'Mithril Bar',   materials.mithril   || 0],
            ['darksteel', 'Darksteel Bar', materials.darksteel || 0],
            ['voidShards','Void Shard',    materials.voidShards|| 0],
          ].map(([key, label, qty]) => `
            <div style="display:flex;justify-content:space-between;padding:9px 12px;border-top:1px solid var(--border)">
              <span style="font-size:12px;color:var(--text-muted)">${label}</span>
              <span style="font-size:12px;font-weight:500;color:${qty > 0 ? 'var(--str)' : 'var(--text-muted)'}">${qty}</span>
            </div>`).join('')}
        </div>
      </div>`;

    return html;
  }

  // ── Full screen HTML ──────────────────────────────────────────────────────
  const statsContent   = buildStatsTab();
  const invContent     = buildInventoryTab();
  const rpgStatsContent = buildRPGStatsTab(profile, inv);

  const html = `
    <!-- Topbar -->
    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px 10px;border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--card);z-index:10">
      <button onclick="showRPGHub()" style="background:none;border:none;color:var(--text-muted);font-family:'DM Mono',monospace;font-size:13px;cursor:pointer;padding:0">← Hub</button>
      <span style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:var(--str)">CHARACTER</span>
      <div style="width:50px"></div>
    </div>

    <!-- Tab bar — 3 tabs -->
    <div style="display:flex;border-bottom:1px solid var(--border)">
      ${['stats','rpgstats','inventory'].map(tab => {
        const labels = { stats:'Character', rpgstats:'RPG Stats', inventory:`Inventory (${inv.length})` };
        const active = activeTab === tab;
        return `<button onclick="showRPGCharacterSheet('${tab}')" style="
          flex:1;padding:10px 4px;background:none;border:none;
          font-family:'DM Mono',monospace;font-size:11px;cursor:pointer;
          color:${active ? 'var(--str)' : 'var(--text-muted)'};
          border-bottom:2px solid ${active ? 'var(--str)' : 'transparent'};
          white-space:nowrap;
        ">${labels[tab]}</button>`;
      }).join('')}
    </div>

    <!-- Tab content -->
    <div style="padding-bottom:20px">
      ${activeTab === 'stats' ? statsContent : activeTab === 'rpgstats' ? rpgStatsContent : invContent}
    </div>`;

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const body = document.getElementById('rpg-screen-body');
  if (body) body.innerHTML = html;
  const screen = document.getElementById('screen-rpg');
  if (screen) screen.classList.add('active');
}

// ============================================================
// PHASE 3 — COMBAT SYSTEM, WILDS, QUEST BOARD
// ============================================================

// ── Tonic heal amount ────────────────────────────────────────────────────────
function rpgTonicHealPct(profile) {
  const herbalist = profile.rpg.castle?.herbalist || 0;
  return [0.25, 0.30, 0.35, 0.40, 0.45, 0.50][herbalist] || 0.25;
}

// ── Loot generation ──────────────────────────────────────────────────────────
function rpgRollLootDrop(band, tier, isQuestBoss, forgeLevel, forceHighTier) {
  const baseWeights = [50, 30, 15, 5, 0, 0, 0, 0, 0, 0];
  const weights = baseWeights.map((w, i) => i === 0 ? w : w + (forgeLevel||0) * 5);
  let maxTier = tier === 'easy' ? 4 : tier === 'medium' ? 6 : isQuestBoss ? 10 : 8;
  // Boss fallback: guarantee at least a +3 item, shift weight to higher tiers
  if (forceHighTier) {
    maxTier = Math.max(maxTier, 6);
    for (let i = 3; i < maxTier; i++) weights[i] = (weights[i] || 0) + 25;
    weights[0] = 0; weights[1] = 10; weights[2] = 20; // reduce low tiers
  }
  const effectiveWeights = weights.map((w, i) => i < maxTier ? w : 0);
  const total = effectiveWeights.reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  let r = Math.random() * total;
  let itemTier = 1;
  for (let i = 0; i < effectiveWeights.length; i++) {
    r -= effectiveWeights[i];
    if (r <= 0) { itemTier = i + 1; break; }
  }

  // Pick random slot and material
  const slots = ['weapon','shield','helmet','body_armor','boots','jewelry'];
  const slot = slots[Math.floor(Math.random() * slots.length)];
  const materials = RPG_BAND_MATERIALS[band] || ['Copper'];
  const material = materials[Math.floor(Math.random() * materials.length)];
  const types = RPG_SLOT_TYPES[slot] || ['Item'];
  const type = types[Math.floor(Math.random() * types.length)];

  // Roll stats with ±10% variance
  const bandIdx = rpgBandIndex(band);
  const scale = RPG_GEAR_SCALE[slot] || RPG_GEAR_SCALE.weapon;
  const baseVal = scale.base[bandIdx] + (itemTier - 1) * scale.inc[bandIdx];
  const rolled = Math.max(1, Math.round(baseVal * (0.9 + Math.random() * 0.2)));

  const rolledStats = {};
  const primaryStat = RPG_SLOT_STAT[slot];
  if (primaryStat === 'STR') rolledStats.effectiveSTR = rolled;
  else if (primaryStat === 'END') rolledStats.effectiveEND = rolled;
  else if (primaryStat === 'AGI') rolledStats.effectiveAGI = rolled;
  else if (primaryStat === 'DEX') rolledStats.effectiveDEX = rolled;

  // Body armor also gets flat HP
  if (slot === 'body_armor') {
    const hpScale = RPG_GEAR_SCALE.body_armor_hp;
    const hpBase = hpScale.base[bandIdx] + (itemTier - 1) * hpScale.inc[bandIdx];
    rolledStats.flatHP = Math.max(1, Math.round(hpBase * (0.9 + Math.random() * 0.2)));
  }

  // Jewelry gets a utility bonus note
  let utilityBonus = null;
  if (slot === 'jewelry') {
    const utils = ['gold_find', 'loot_luck'];
    utilityBonus = utils[Math.floor(Math.random() * utils.length)];
    const gem = Object.keys(RPG_JEWELRY_GEMS)[Math.floor(Math.random() * 4)];
    const gemName = RPG_JEWELRY_GEMS[gem];
    // Assign primary stat based on gem type
    if (gem === 'STR') rolledStats.effectiveSTR = rolled;
    else if (gem === 'END') rolledStats.effectiveEND = rolled;
    else if (gem === 'AGI') rolledStats.effectiveAGI = rolled;
    else rolledStats.effectiveDEX = rolled;
    return {
      instanceId: rpgUUID(),
      name: `${material} ${gemName} ${type}`,
      slot, band, tier: itemTier,
      rolledStats, utilityBonus,
      isUnique: false, favorite: false,
      acquiredAt: new Date().toISOString().slice(0, 10),
    };
  }

  return {
    instanceId: rpgUUID(),
    name: `${material} ${type}`,
    slot, band, tier: itemTier,
    rolledStats,
    isUnique: false, favorite: false,
    acquiredAt: new Date().toISOString().slice(0, 10),
  };
}

// Drop chance by tier
function rpgShouldDropLoot(enemyTier) {
  const chances = { easy: 0.40, medium: 0.65, hard: 0.85 };
  return Math.random() < (chances[enemyTier] || 0.40);
}

// ── Workout stat boost helpers ────────────────────────────────────────────────
function rpgGetStatBoostMultiplier(profile) {
  const boost = profile.rpg?.statBoost;
  if (!boost) return { atkMult: 1, defMult: 1, agiBonus: 0 };
  const type = boost.type;
  const bonus = 0.12; // 12% base — tunable later
  if (type === 'push')  return { atkMult: 1 + bonus, defMult: 1, agiBonus: 0 };
  if (type === 'pull')  return { atkMult: 1, defMult: 1, agiBonus: 0 }; // DEX → crit handled in formula
  if (type === 'legs')  return { atkMult: 1, defMult: 1, agiBonus: Math.floor(bonus * 50) };
  if (type === 'core')  return { atkMult: 1, defMult: 1 + bonus, agiBonus: 0 };
  return { atkMult: 1, defMult: 1, agiBonus: 0 };
}


// ── Unique item generation ────────────────────────────────────────────────────
function rpgGenerateUniqueItem(band, tier) {
  const slots    = ['weapon','shield','helmet','body_armor','boots','jewelry'];
  const stats    = ['STR','END','AGI','DEX'];
  const slot     = slots[Math.floor(Math.random() * slots.length)];
  const primary  = stats[Math.floor(Math.random() * stats.length)];
  const secondary = RPG_UNIQUE_SECONDARY[slot];
  const bandIdx  = rpgBandIndex(band);
  const bandGroup = rpgBandGroup(band);
  const materials = RPG_BAND_MATERIALS[band] || ['Copper'];
  const mat      = materials[bandIdx % materials.length];
  const kw       = RPG_UNIQUE_KEYWORDS[primary][bandIdx % 8];
  const types    = RPG_SLOT_TYPES[slot] || ['Item'];
  const type     = types[Math.floor(Math.random() * types.length)];
  const name     = `${kw} ${mat} ${type}`;

  // Roll primary stat
  const scale    = RPG_GEAR_SCALE[slot] || RPG_GEAR_SCALE.weapon;
  const baseVal  = scale.base[bandIdx] + (tier - 1) * scale.inc[bandIdx];
  const rolled   = Math.max(1, Math.round(baseVal * (0.9 + Math.random() * 0.2)));

  // Roll secondary stat (always smaller than primary)
  const secScale = RPG_GEAR_SCALE[secondary.toLowerCase() === 'str' ? 'weapon' :
                    secondary === 'END' ? 'shield' : secondary === 'AGI' ? 'boots' : 'helmet'];
  const secBase  = (secScale?.base[bandIdx] || scale.base[bandIdx]) * 0.65;
  const secInc   = (secScale?.inc[bandIdx]  || scale.inc[bandIdx])  * 0.65;
  const secVal   = Math.max(1, Math.round((secBase + (tier-1)*secInc) * (0.9 + Math.random()*0.2)));

  const rolledStats = {};
  if (primary === 'STR') rolledStats.effectiveSTR = rolled;
  else if (primary === 'END') rolledStats.effectiveEND = rolled;
  else if (primary === 'AGI') rolledStats.effectiveAGI = rolled;
  else if (primary === 'DEX') rolledStats.effectiveDEX = rolled;

  if (secondary === 'STR') rolledStats.effectiveSTR = (rolledStats.effectiveSTR||0) + secVal;
  else if (secondary === 'END') rolledStats.effectiveEND = (rolledStats.effectiveEND||0) + secVal;
  else if (secondary === 'AGI') rolledStats.effectiveAGI = (rolledStats.effectiveAGI||0) + secVal;
  else if (secondary === 'DEX') rolledStats.effectiveDEX = (rolledStats.effectiveDEX||0) + secVal;

  if (slot === 'body_armor') {
    const hs = RPG_GEAR_SCALE.body_armor_hp;
    rolledStats.flatHP = Math.max(1, Math.round((hs.base[bandIdx]+(tier-1)*hs.inc[bandIdx])*(0.9+Math.random()*0.2)));
  }

  const passive = rpgUniquePassive(slot, bandGroup, tier);

  return {
    instanceId: rpgUUID(),
    name, slot, band, tier,
    primary, secondary,
    rolledStats, passive,
    isUnique: true, favorite: false,
    acquiredAt: new Date().toISOString().slice(0, 10),
  };
}

// ── Unique drop roll ──────────────────────────────────────────────────────────
// Returns a unique item or null. Called alongside standard loot roll.
function rpgRollUniqueDrop(band, tier, enemyTier, isBoss) {
  if (!isBoss) return null;
  const chances = { hard: 0.60, medium: 0.15, easy: 0.05 };
  const chance  = chances[enemyTier] || 0;
  if (Math.random() >= chance) return null;
  // Tier: +1 to +3 on drop for easy/medium bosses, +1 to +3 for hard too
  // Hard bosses weight toward +3
  const tierWeights = enemyTier === 'hard' ? [20,40,40] : [60,30,10];
  const tw = tierWeights.reduce((a,b)=>a+b,0);
  let r = Math.random()*tw, uniqueTier = 1;
  for (let i=0;i<tierWeights.length;i++){r-=tierWeights[i];if(r<=0){uniqueTier=i+1;break;}}
  return rpgGenerateUniqueItem(band, uniqueTier);
}


// ── Active passive computation ────────────────────────────────────────────────
// Called at combat start and stored on combat state.
// Returns { lifesteal, haste, sharp_eye, reflect, thorns, resilience }
// Stacking: first item full value, second 60%, third+ 15%
function rpgComputeActivePassives(profile) {
  const inv      = rpgGetInventory();
  const equipped = profile.rpg.equipped || {};
  const passivesByType = {};

  Object.values(equipped).forEach(eq => {
    if (!eq) return;
    const inst = inv.find(i => i.instanceId === eq.instanceId);
    if (!inst?.isUnique || !inst.passive) return;
    const type = inst.passive.type;
    if (!passivesByType[type]) passivesByType[type] = [];
    passivesByType[type].push(inst.passive);
  });

  const stacking = [1.0, 0.60, 0.15];

  const result = {};
  Object.entries(passivesByType).forEach(([type, passives]) => {
    passives.forEach((p, idx) => {
      const mult = stacking[Math.min(idx, stacking.length-1)];
      if (!result[type]) result[type] = { ...p };
      if (idx === 0) return; // first already set

      // Merge subsequent items with stacking penalty
      if (type === 'lifesteal')  result[type].pct         += Math.round(p.pct * mult);
      if (type === 'sharp_eye')  result[type].pct         += Math.round(p.pct * mult);
      if (type === 'haste')      result[type].ticks       += Math.round(p.ticks * mult);
      if (type === 'reflect')    { result[type].chance    += Math.round(p.chance * mult); result[type].dmgReduce += Math.round(p.dmgReduce * mult); }
      if (type === 'thorns')     result[type].pct         += Math.round(p.pct * mult);
      if (type === 'resilience') result[type].hp          += Math.round(p.hp * mult);
    });
  });
  return result;
}


// ── Crafting material drops ───────────────────────────────────────────────────
// Called after every enemy kill. Returns array of { material, qty } objects.
function rpgRollMaterialDrop(enemyTier, isBoss) {
  const drops = [];
  const roll  = () => Math.random();

  if (isBoss) {
    // Bosses: guaranteed copper, plus independent rolls for higher tiers
    drops.push({ material:'copper', qty:1 });
    if (roll() < 0.60) drops.push({ material:'iron',      qty:1 });
    if (roll() < 0.25) drops.push({ material:'mithril',   qty:1 });
    if (roll() < 0.10) drops.push({ material:'darksteel', qty:1 });
    // Void Shards — boss only
    const voidChance = enemyTier === 'hard' ? 0.35 : enemyTier === 'medium' ? 0.15 : 0.05;
    if (roll() < voidChance) drops.push({ material:'voidShards', qty:1 });
  } else if (enemyTier === 'hard') {
    if (roll() < 0.80) drops.push({ material:'copper',    qty:1 });
    if (roll() < 0.35) drops.push({ material:'iron',      qty:1 });
    if (roll() < 0.12) drops.push({ material:'mithril',   qty:1 });
    if (roll() < 0.04) drops.push({ material:'darksteel', qty:1 });
  } else if (enemyTier === 'medium') {
    if (roll() < 0.50) drops.push({ material:'copper',    qty:1 });
    if (roll() < 0.15) drops.push({ material:'iron',      qty:1 });
    if (roll() < 0.04) drops.push({ material:'mithril',   qty:1 });
    if (roll() < 0.01) drops.push({ material:'darksteel', qty:1 });
  } else {
    // Easy
    if (roll() < 0.25) drops.push({ material:'copper',    qty:1 });
    if (roll() < 0.05) drops.push({ material:'iron',      qty:1 });
    if (roll() < 0.01) drops.push({ material:'mithril',   qty:1 });
  }
  return drops;
}

// Award materials to profile and return a log string
function rpgAwardMaterials(drops, profile) {
  if (!drops.length) return null;
  if (!profile.rpg.materials) profile.rpg.materials = { copper:0, iron:0, mithril:0, darksteel:0, voidShards:0 };
  drops.forEach(d => {
    profile.rpg.materials[d.material] = (profile.rpg.materials[d.material] || 0) + d.qty;
  });
  const summary = drops.map(d => `${d.qty}× ${rpgMaterialLabel(d.material)}`).join(', ');
  return summary;
}

// Quest completion material bonus (guaranteed)
function rpgQuestCompletionMaterials(questDifficulty) {
  if (questDifficulty === 'hard')   return [{ material:'copper', qty:1 }, { material:'iron', qty:1 }, { material:'mithril', qty:1 }];
  if (questDifficulty === 'medium') return [{ material:'copper', qty:1 }, { material:'iron', qty:1 }, { material:'iron', qty:Math.random()<0.5?1:0 }].filter(d=>d.qty>0);
  // easy
  return [{ material:'copper', qty:2 + (Math.random()<0.5?1:0) }];
}

// ── THE WILDS SCREEN ─────────────────────────────────────────────────────────
function showRPGWilds() {
  const profile     = rpgGetProfile();
  const stats       = rpgPlayerStats(profile);
  const band        = rpgLevelBand(stats.level);
  const bp          = BAND_POWER[band];
  const watchtower  = profile.rpg.castle?.watchtower || 0;

  const locations = [
    { id:'field',   label:'Open Field',     tier:'easy',   icon:'🌾',
      desc:'Wandering creatures and lesser threats.',
      goldRange: `${Math.round(bp*0.16*0.9)}–${Math.round(bp*0.20*1.1)}g` },
    { id:'forest',  label:'Dark Forest',    tier:'medium', icon:'🌲',
      desc:'Dangerous beasts and cursed wanderers.',
      goldRange: `${Math.round(bp*0.20*0.9)}–${Math.round(bp*0.24*1.1)}g` },
    { id:'castle',  label:'Ancient Castle', tier:'hard',   icon:'🏰',
      desc:'Elite knights, powerful undead. Come prepared.',
      goldRange: `${Math.round(bp*0.24*0.9)}–${Math.round(bp*0.30*1.1)}g` },
  ];

  // Pre-scout one enemy per location using the same spawn logic (for watchtower display)
  // We use a fixed seed so the preview is stable until you actually fight
  const scoutedEnemies = {};
  if (watchtower >= 1) {
    locations.forEach(loc => {
      const e = rpgRandomEnemy(stats.level, loc.tier, stats);
      if (e) scoutedEnemies[loc.tier] = e;
    });
  }

  const html = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px 10px;border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--card);z-index:10">
      <button onclick="showRPGHub()" style="background:none;border:none;color:var(--text-muted);font-family:'DM Mono',monospace;font-size:13px;cursor:pointer;padding:0">← Hub</button>
      <span style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:var(--str)">THE WILDS</span>
      <div style="font-size:10px;color:var(--text-muted)">${watchtower >= 1 ? '🗼 Lv'+watchtower : ''}</div>
    </div>
    <div style="padding:16px">
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:16px">Choose a location to fight a random enemy.  Logging a workout heals you to full between fights.</div>
      ${locations.map(loc => {
        const scout = scoutedEnemies[loc.tier];
        let scoutHtml = '';
        if (watchtower >= 1 && scout) {
          const atkVal  = Math.round(scout.atk);
          const hpVal   = scout.maxHP;
          const goldVal = watchtower >= 2 ? `  ·  ${scout.goldDrop ?? Math.round((scout.goldMin+scout.goldMax)/2)}g` : '';
          const diffVal = watchtower >= 3 ? `  ·  diff ${scout.diffScore ?? '?'}` : '';
          scoutHtml = `
            <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);
              display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              <span style="font-size:9px;color:#8BC4C4;letter-spacing:0.08em;text-transform:uppercase">🗼 Scouted:</span>
              <span style="font-size:11px;color:var(--text)">${scout.name}</span>
              <span style="font-size:10px;color:var(--text-muted)">· ATK ${atkVal}  ·  HP ${hpVal}${goldVal}${diffVal}</span>
            </div>`;
        }
        return `
        <div onclick="rpgStartRandomBattle('${loc.tier}')" style="
          background:var(--surface);border:1px solid var(--border);border-radius:10px;
          padding:16px;margin-bottom:12px;cursor:pointer;
        ">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div style="display:flex;align-items:center;gap:10px">
              <span style="font-size:24px">${loc.icon}</span>
              <div>
                <div style="font-size:14px;font-weight:500">${loc.label}</div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${loc.desc}</div>
              </div>
            </div>
            <div style="text-align:right">
              <div style="font-size:10px;color:var(--text-muted)">GOLD / FIGHT</div>
              <div style="font-size:13px;color:#FFA726">${loc.goldRange}</div>
            </div>
          </div>
          ${scoutHtml}
        </div>`;
      }).join('')}
    </div>`;

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('rpg-screen-body').innerHTML = html;
  document.getElementById('screen-rpg').classList.add('active');
  if (typeof setActiveNav === 'function') setActiveNav('bnav-rpg');
}

function rpgStartRandomBattle(tier) {
  const profile = rpgGetProfile();
  const stats   = rpgPlayerStats(profile);
  const band    = rpgLevelBand(stats.level);
  const enemy   = rpgRandomEnemy(stats.level, tier, stats);
  if (!enemy) { alert('No enemies found for this tier.'); return; }

  // Initialise currentHP if needed
  if (!profile.rpg.currentHP) {
    profile.rpg.currentHP = stats.maxHP;
    rpgSaveProfile(profile);
  }

  const combatState = {
    active: true,
    questId: null,
    location: tier === 'easy' ? 'field' : tier === 'medium' ? 'forest' : 'castle',
    enemyIndex: 0,
    enemy,
    playerHP: profile.rpg.currentHP,
    tickPosition: { player: stats.interval, enemy: enemy.interval },
    battleLog: [],
    goldEarned: 0,
    pendingLoot: [],
    goldMultiplier: 1 + (profile.rpg.castle?.vault || 0) * 0.05,
    activePassives: rpgComputeActivePassives(profile),
    battleHardenedActive: false,
    hpOnStart: profile.rpg.currentHP,
    emberTonicsUsed: 0,
    isRandomBattle: true,
    enemyTier: tier,
    band,
  };
  rpgSaveCombat(combatState);
  showRPGCombat();
}

// ── QUEST BOARD ──────────────────────────────────────────────────────────────
function showRPGQuestBoard() {
  const profile  = rpgGetProfile();
  const today    = new Date().toISOString().slice(0, 10);

  // Reset refresh cost at midnight on board open
  const qr = profile.rpg.questRefresh || { cost:100, count:0, lastReset:null };
  if (qr.lastReset !== today) {
    profile.rpg.questRefresh = { cost:100, count:0, lastReset:today };
    rpgSaveProfile(profile);
  }

  const stats    = rpgPlayerStats(profile);
  const band     = rpgLevelBand(stats.level);
  const prevBand = rpgPrevBand(band);

  // Get one quest per difficulty from current + previous band
  const pool = RPG_QUESTS.filter(q => q.band === band || q.band === prevBand);
  const easy   = pool.filter(q => q.difficulty === 'easy');
  const medium = pool.filter(q => q.difficulty === 'medium');
  const hard   = pool.filter(q => q.difficulty === 'hard');

  // Daily quest selection — seeded by date + player level so it's consistent per day
  // Use a proper hash so rotation varies across different pool sizes each day
  const dateStr = today.replace(/-/g,'');
  const seed = (parseInt(dateStr, 10) * 31 + stats.level * 17) >>> 0;
  const pick = (arr, offset) => arr.length ? arr[(seed + offset) % arr.length] : null;

  const questSlots = [pick(easy, 0), pick(medium, 7), pick(hard, 13)].filter(Boolean);

  // Refresh cost
  const refreshCost = profile.rpg.questRefresh?.cost || 100;

  const diffColors = { easy:'#4CAF50', medium:'#FFA726', hard:'#EF5350' };
  const diffLabels = { easy:'Easy', medium:'Medium', hard:'Hard' };

  const html = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px 10px;border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--card);z-index:10">
      <button onclick="showRPGHub()" style="background:none;border:none;color:var(--text-muted);font-family:'DM Mono',monospace;font-size:13px;cursor:pointer;padding:0">← Hub</button>
      <span style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:var(--str)">QUEST BOARD</span>
      <div style="width:50px"></div>
    </div>
    <div style="padding:16px">
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:16px">Quests require defeating all enemies in sequence.  No healing from workouts mid-quest — logging a workout grants Battle Hardened (+25% gold).</div>

      ${questSlots.map(q => {
        const col = diffColors[q.difficulty];
        const enemyNames = q.enemies.map(e => {
          const def = RPG_ENEMIES.find(en => en.id === e.enemyId);
          return (def?.name || e.enemyId) + (e.isBoss ? ' ⚠️' : '');
        }).join(' → ');
        return `<div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
            <div style="font-size:14px;font-weight:500">${q.name}</div>
            <span style="font-size:10px;background:${col}22;color:${col};padding:2px 8px;border-radius:4px;white-space:nowrap">${diffLabels[q.difficulty]}</span>
          </div>
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;font-style:italic">${q.flavor}</div>
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:12px">${enemyNames}</div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div style="font-size:11px;color:#FFA726">${q.goldMin}–${q.goldMax}g + loot</div>
            <button onclick="rpgStartQuest('${q.id}')" style="
              background:none;border:1px solid ${col};border-radius:6px;
              color:${col};font-family:'DM Mono',monospace;font-size:11px;
              padding:6px 14px;cursor:pointer;
            ">Begin Quest</button>
          </div>
        </div>`;
      }).join('')}

      <div style="text-align:center;margin-top:8px">
        <button onclick="rpgRefreshQuests()" style="
          background:none;border:1px solid var(--border);border-radius:8px;
          color:var(--text-muted);font-family:'DM Mono',monospace;font-size:11px;
          padding:10px 20px;cursor:pointer;
        ">Refresh Quests — ${refreshCost}g</button>
      </div>
    </div>`;

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('rpg-screen-body').innerHTML = html;
  document.getElementById('screen-rpg').classList.add('active');
  if (typeof setActiveNav === 'function') setActiveNav('bnav-rpg');
}

function rpgPrevBand(band) {
  const bands = ['1-5','6-10','11-15','16-20','21-25','26-30','31-35','36-40','41-45','46-50'];
  const idx = bands.indexOf(band);
  return idx > 0 ? bands[idx - 1] : band;
}

function rpgRefreshQuests() {
  const profile = rpgGetProfile();
  const today   = new Date().toISOString().slice(0, 10);

  // Reset doubling cost at midnight
  const qr = profile.rpg.questRefresh || { cost:100, count:0, lastReset:null };
  if (qr.lastReset !== today) {
    qr.cost      = 100;
    qr.count     = 0;
    qr.lastReset = today;
    profile.rpg.questRefresh = qr;
  }

  const cost = qr.cost;
  if ((profile.rpg.gold || 0) < cost) {
    alert(`Not enough gold.  You need ${cost}g to refresh quests.`);
    return;
  }
  profile.rpg.gold -= cost;
  profile.rpg.questRefresh = {
    cost: cost * 2,
    count: qr.count + 1,
    lastReset: today,
  };
  rpgSaveProfile(profile);
  showRPGQuestBoard();
}

function rpgStartQuest(questId) {
  const quest = RPG_QUESTS.find(q => q.id === questId);
  if (!quest) return;
  const profile = rpgGetProfile();
  const stats   = rpgPlayerStats(profile);

  if (!profile.rpg.currentHP) {
    profile.rpg.currentHP = stats.maxHP;
    rpgSaveProfile(profile);
  }

  // Boss gate — check if first enemy is a boss (single-enemy hard quests)
  // or if any enemy in the quest is a boss that requires entry HP check.
  // Gate only applies at quest START — never mid-fight during enemy advancement.
  const firstEnemy = quest.enemies[0];
  if (firstEnemy.isBoss && quest.bossGateHP) {
    const hpRequired = Math.round(stats.maxHP * quest.bossGateHP);
    if (profile.rpg.currentHP < hpRequired) {
      const bossName = RPG_ENEMIES.find(e => e.id === firstEnemy.enemyId)?.name || 'the boss';
      alert(`⚠️ You need ${hpRequired} HP to begin this quest (you have ${profile.rpg.currentHP}).  Log a workout to heal first.`);
      return;
    }
  }
  // For multi-enemy quests where the boss is the final enemy,
  // check gate at start so player must prepare before committing.
  const lastEnemy = quest.enemies[quest.enemies.length - 1];
  if (lastEnemy.isBoss && quest.bossGateHP && quest.enemies.length > 1) {
    const hpRequired = Math.round(stats.maxHP * quest.bossGateHP);
    if (profile.rpg.currentHP < hpRequired) {
      alert(`⚠️ This quest ends with a boss.  You need at least ${hpRequired} HP to begin (you have ${profile.rpg.currentHP}).  Log a workout to heal first.`);
      return;
    }
  }

  const firstQuestEnemy = rpgSpawnEnemy(quest.enemies[0].enemyId, stats);
  const combatState = {
    active: true,
    questId,
    questName: quest.name,
    location: 'quest',
    enemyIndex: 0,
    enemy: firstQuestEnemy,
    isBoss: quest.enemies[0].isBoss,
    playerHP: profile.rpg.currentHP,
    tickPosition: { player: stats.interval, enemy: firstQuestEnemy.interval },
    battleLog: [],
    goldEarned: 0,
    pendingLoot: [],
    goldMultiplier: 1 + (profile.rpg.castle?.vault || 0) * 0.05,
    activePassives: rpgComputeActivePassives(profile),
    battleHardenedActive: false,
    hpOnStart: profile.rpg.currentHP,
    emberTonicsUsed: 0,
    isRandomBattle: false,
    band: quest.band,
    enemyTier: quest.difficulty,
  };
  rpgSaveCombat(combatState);
  showRPGCombat();
}

// ── COMBAT SCREEN ────────────────────────────────────────────────────────────
function showRPGCombat() {
  const combat  = rpgGetCombat();
  if (!combat || !combat.active) { showRPGHub(); return; }

  const profile    = rpgGetProfile();
  const stats      = rpgPlayerStats(profile);
  const boosts     = rpgGetStatBoostMultiplier(profile);
  const watchtower = profile.rpg.castle?.watchtower || 0;

  const playerHP    = combat.playerHP;
  const playerMaxHP = stats.maxHP;
  const playerHPPct = Math.max(0, Math.round((playerHP / playerMaxHP) * 100));
  const playerHPCol = playerHPPct > 60 ? '#4CAF50' : playerHPPct > 30 ? '#FFA726' : '#EF5350';

  const enemy       = combat.enemy;
  const enemyHPPct  = Math.max(0, Math.round((enemy.currentHP / enemy.maxHP) * 100));
  const enemyHPCol  = enemyHPPct > 60 ? '#4CAF50' : enemyHPPct > 30 ? '#FFA726' : '#EF5350';

  const tonics    = profile.rpg.emberTonics || 0;
  const tonicHeal = Math.round(rpgTonicHealPct(profile) * playerMaxHP);

  // Next attack indicator
  const pt = combat.tickPosition.player;
  const et = combat.tickPosition.enemy;
  const nextIsPlayer = pt <= et;
  const nextTicks    = Math.min(pt, et);
  const nextLabel    = nextIsPlayer ? '⚡ YOUR TURN' : '⚡ ENEMY TURN';
  const nextColor    = nextIsPlayer ? 'var(--str)' : '#EF5350';

  // Battle log (last 6 entries)
  // Classify log lines for color coding
  function rpgLogLineColor(line) {
    if (/Lifesteal|Thorns|Reflect/.test(line))         return '#CE93D8'; // passive proc — purple
    if (/critically strike/.test(line))                return '#FFD54F'; // crit — warm yellow
    if (/Workout logged|Battle Hardened/.test(line))   return 'var(--str)'; // workout event — amber
    if (/defeated!|defeated\./.test(line))             return '#4CAF50'; // enemy down — green
    if (/You have been defeated/.test(line))           return '#EF5350'; // player down — red
    if (/^\+\d+g/.test(line.trim()))                   return '#FFA726'; // gold drop — gold
    if (/Healed to full|Heal/.test(line))              return '#4CAF50'; // heal — green
    if (/attacks for/.test(line))                      return '#EF535099'; // enemy attack — dim red
    return null; // default
  }

  const logLines = (combat.battleLog || []).slice(-6).reverse().map((line, i) => {
    const classified = rpgLogLineColor(line);
    const color = classified || (i === 0 ? 'var(--text)' : 'var(--text-muted)');
    const bold  = classified && i === 0 ? 'font-weight:500;' : '';
    return `<div style="font-size:11px;color:${color};${bold}padding:3px 0;border-bottom:1px solid var(--border)">${line}</div>`;
  }).join('');

  // Quest progress
  let questProgress = '';
  if (!combat.isRandomBattle) {
    const quest = RPG_QUESTS.find(q => q.id === combat.questId);
    if (quest) {
      questProgress = `<div style="font-size:10px;color:var(--text-muted);text-align:center;margin-bottom:8px">
        ${quest.name} — Enemy ${combat.enemyIndex + 1} of ${quest.enemies.length}
        ${combat.battleHardenedActive ? ' · <span style="color:var(--str)">Battle Hardened</span>' : ''}
      </div>`;
    }
  }

  const html = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px 10px;border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--card);z-index:10">
      <button onclick="rpgFleeCombat()" style="background:none;border:none;color:var(--text-muted);font-family:'DM Mono',monospace;font-size:13px;cursor:pointer;padding:0">← Flee</button>
      <span style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:var(--str)">COMBAT</span>
      <div style="font-size:11px;color:#FFA726">${(combat.goldEarned||0)}g</div>
    </div>

    <div style="padding:12px 16px">
      ${questProgress}

      <!-- Enemy card -->
      <div style="background:var(--surface);border:1px solid #EF535044;border-radius:10px;padding:14px;margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <div>
            <div style="font-size:15px;font-weight:500">${enemy.name}</div>
            <div style="font-size:10px;color:var(--text-muted);margin-top:2px;font-style:italic">${enemy.flavor || ''}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
            <span style="font-size:10px;background:#EF535022;color:#EF5350;padding:2px 8px;border-radius:4px">${enemy.tier}</span>
            ${watchtower >= 1 ? `<span style="font-size:10px;color:var(--text-muted)">ATK ${Math.round(enemy.atk)}</span>` : ''}
            ${watchtower >= 2 ? `<span style="font-size:10px;color:#FFA726">${enemy.goldMin ?? '?'}–${enemy.goldMax ?? '?'}g</span>` : ''}
            ${watchtower >= 3 ? `<span style="font-size:10px;color:#8BC4C4">diff ${enemy.diffScore ?? '?'}</span>` : ''}
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted);margin-bottom:3px">
          <span>HP</span><span>${Math.max(0,enemy.currentHP)} / ${enemy.maxHP}</span>
        </div>
        <div style="background:var(--border);border-radius:3px;height:6px;overflow:hidden">
          <div style="width:${enemyHPPct}%;height:100%;background:${enemyHPCol};border-radius:3px;transition:width 0.3s"></div>
        </div>
      </div>

      <!-- Next attack indicator -->
      <div style="text-align:center;padding:8px 0;font-family:'DM Mono',monospace;font-size:12px;color:${nextColor};letter-spacing:0.05em">
        ${nextLabel} <span style="color:var(--text-muted)">(${nextTicks} ticks)</span>
      </div>

      <!-- Player card -->
      <div style="background:var(--surface);border:1px solid var(--str)44;border-radius:10px;padding:14px;margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div style="font-size:14px;font-weight:500">${profile.name || 'Athlete'}</div>
          <div style="font-size:11px;color:var(--text-muted)">ATK ${Math.round(stats.atk * boosts.atkMult)}</div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted);margin-bottom:3px">
          <span>HP</span><span>${Math.max(0,playerHP)} / ${playerMaxHP}</span>
        </div>
        <div style="background:var(--border);border-radius:3px;height:6px;overflow:hidden">
          <div id="player-hp-bar" style="width:${playerHPPct}%;height:100%;background:${playerHPCol};border-radius:3px;transition:width 1.5s ease"></div>
        </div>
        ${profile.rpg.statBoost ? `<div style="font-size:10px;color:var(--str);margin-top:6px">▲ ${profile.rpg.statBoost.type} boost active</div>` : ''}
      </div>

      <!-- Battle log -->
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:12px;min-height:80px">
        ${logLines || '<div style="font-size:11px;color:var(--text-muted);font-style:italic">Combat begins...</div>'}
      </div>

      <!-- Action buttons -->
      <div style="display:flex;gap:10px">
        <button onclick="rpgUseTonic()" ${tonics <= 0 ? 'disabled' : ''} style="
          flex:1;padding:14px;background:none;
          border:1px solid ${tonics > 0 ? 'var(--str)' : 'var(--border)'};
          border-radius:8px;
          color:${tonics > 0 ? 'var(--str)' : 'var(--text-muted)'};
          font-family:'DM Mono',monospace;font-size:12px;cursor:${tonics > 0 ? 'pointer' : 'default'};
        ">🧪 Tonic (${tonics}) +${tonicHeal}HP</button>
        <button onclick="rpgAttack()" style="
          flex:2;padding:14px;background:var(--str);
          border:none;border-radius:8px;
          color:#fff;font-family:'DM Mono',monospace;
          font-size:14px;font-weight:500;cursor:pointer;letter-spacing:0.05em;
        ">⚔️ ATTACK</button>
      </div>
    </div>`;

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('rpg-screen-body').innerHTML = html;
  document.getElementById('screen-rpg').classList.add('active');
  if (typeof setActiveNav === 'function') setActiveNav('bnav-rpg');
}

// ── Tonic usage (free action — does not consume attack turn) ─────────────────
function rpgUseTonic() {
  const profile = rpgGetProfile();
  if ((profile.rpg.emberTonics || 0) <= 0) return;

  const stats    = rpgPlayerStats(profile);
  const combat   = rpgGetCombat();
  if (!combat) return;

  const healAmt  = Math.round(rpgTonicHealPct(profile) * stats.maxHP);
  const newHP    = Math.min(stats.maxHP, combat.playerHP + healAmt);
  combat.playerHP = newHP;
  combat.battleLog.push(`You drink an Ember Tonic.  +${healAmt} HP → ${newHP}/${stats.maxHP}`);
  combat.emberTonicsUsed++;
  rpgSaveCombat(combat);

  profile.rpg.emberTonics--;
  rpgStat(profile, 'tonicsUsed', 1);
  rpgSaveProfile(profile);

  showRPGCombat();
}

// ── Attack action ─────────────────────────────────────────────────────────────
function rpgAttack() {
  const profile = rpgGetProfile();
  const stats   = rpgPlayerStats(profile);
  const boosts  = rpgGetStatBoostMultiplier(profile);
  const combat  = rpgGetCombat();
  if (!combat || !combat.active) return;

  const playerATK = Math.round(stats.atk * boosts.atkMult);
  const mit       = stats.mitigation * (boosts.defMult > 1 ? boosts.defMult - 1 + 1 : 1);
  let   pHP       = combat.playerHP;
  let   eHP       = combat.enemy.currentHP;
  let   pt        = combat.tickPosition.player;
  let   et        = combat.tickPosition.enemy;
  const log       = [...(combat.battleLog || [])];
  const ap        = combat.activePassives || {};  // active passives shorthand

  // Apply Haste passive — reduce effective interval for this attack calculation
  const hasteReduction = (ap.haste && !combat._hasteApplied) ? ap.haste.ticks : 0;
  if (ap.haste && !combat._hasteApplied) combat._hasteApplied = true;
  const effectiveInterval = Math.max(4, stats.interval - hasteReduction);
  // Apply Sharp Eye passive to crit chance
  const effectiveCrit = Math.min(0.95, stats.critChance + (ap.sharp_eye ? ap.sharp_eye.pct / 100 : 0));

  // Advance ticks until player's next action
  const advance = pt;
  et -= advance;
  pt = 0;

  // Process any enemy attacks that fall in this window
  while (et <= 0 && eHP > 0) {
    let rawDmg  = Math.round(combat.enemy.atk * (0.9 + Math.random() * 0.2));
    // Reflect passive — chance to reduce incoming damage
    if (ap.reflect && Math.random() * 100 < ap.reflect.chance) {
      rawDmg = Math.max(1, rawDmg - ap.reflect.dmgReduce);
    }
    const actDmg  = Math.max(1, Math.round(rawDmg * (1 - stats.mitigation)));
    pHP = Math.max(0, pHP - actDmg);
    log.push(`${combat.enemy.name} attacks for ${actDmg} damage.  Your HP: ${pHP}/${stats.maxHP}`);
    combat._sessionDmgTaken = (combat._sessionDmgTaken || 0) + actDmg;
    if (actDmg > (combat._sessionBiggestHitTaken || 0)) combat._sessionBiggestHitTaken = actDmg;
    // Thorns passive — reflect % of damage back
    if (ap.thorns && actDmg > 0 && eHP > 0) {
      const thornsDmg = Math.max(1, Math.round(actDmg * ap.thorns.pct / 100));
      eHP = Math.max(0, eHP - thornsDmg);
      log.push(`Thorns: ${thornsDmg} reflected to ${combat.enemy.name}`);
    }
    et += combat.enemy.interval;
    if (pHP <= 0) break;
  }

  // Player attacks
  if (pHP > 0 && eHP > 0) {
    const variance = 0.9 + Math.random() * 0.2;
    const isCrit   = Math.random() < effectiveCrit;
    let dmg        = Math.round(playerATK * variance);
    if (isCrit) dmg = Math.round(dmg * 1.75);
    eHP = Math.max(0, eHP - dmg);
    log.push(`You ${isCrit ? '⚡ critically strike' : 'attack'} for ${dmg} damage.  Enemy HP: ${eHP}/${combat.enemy.maxHP}`);
    combat._sessionDmgDealt = (combat._sessionDmgDealt || 0) + dmg;
    if (dmg > (combat._sessionBiggestHit || 0)) combat._sessionBiggestHit = dmg;
    // Lifesteal passive — heal % of damage dealt
    if (ap.lifesteal && dmg > 0) {
      const healAmt = Math.min(stats.maxHP - pHP, Math.round(dmg * ap.lifesteal.pct / 100));
      if (healAmt > 0) {
        pHP = Math.min(stats.maxHP, pHP + healAmt);
        log.push(`Lifesteal: +${healAmt} HP`);
      }
    }
    pt += effectiveInterval;
  } else if (pHP > 0) {
    pt += effectiveInterval;
  }

  combat.enemy.currentHP = eHP;
  combat.playerHP = pHP;
  combat.tickPosition = { player: pt, enemy: et };
  combat.battleLog = log;

  // ── Player defeated ────────────────────────────────────────────────────────
  if (pHP <= 0) {
    log.push(`You have been defeated.`);
    combat.active = false;
    rpgSaveCombat(combat);
    profile.rpg.currentHP = 1;
    rpgStat(profile, 'battlesLost', 1);
    rpgStat(profile, 'totalDamageTaken', combat._sessionDmgTaken || 0);
    rpgStat(profile, 'totalDamageDealt', combat._sessionDmgDealt || 0);
    rpgStatMax(profile, 'biggestHit', combat._sessionBiggestHit || 0);
    rpgStatMax(profile, 'biggestHitTaken', combat._sessionBiggestHitTaken || 0);
    profile.rpg.stats.currentWinStreak = 0;
    rpgSaveProfile(profile);
    showRPGDefeat(combat);
    return;
  }

  // ── Enemy defeated ─────────────────────────────────────────────────────────
  if (eHP <= 0) {
    log.push(`${combat.enemy.name} defeated!`);

    // Gold from this enemy
    const goldMult = combat.goldMultiplier || 1;
    const goldDrop = Math.round(combat.enemy.goldDrop * goldMult);
    combat.goldEarned = (combat.goldEarned || 0) + goldDrop;
    log.push(`+${goldDrop}g`);
    // Track kill
    rpgStat(profile, 'enemiesDefeated', 1);
    if (combat.isBoss) rpgStat(profile, 'bossesDefeated', 1);
    rpgStatKill(profile, combat.enemy.id);

    // Material drops — roll per kill, accumulate on combat state
    const matDrops = rpgRollMaterialDrop(combat.enemyTier, combat.isBoss || false);
    if (matDrops.length > 0) {
      if (!combat.pendingMaterials) combat.pendingMaterials = [];
      combat.pendingMaterials.push(...matDrops);
    }

    // Loot roll — always attempt standard drop, additionally attempt unique on bosses
    const forgeLevel = profile.rpg.castle?.forge || 0;
    // Unique drop attempt first (bosses only)
    if (combat.isBoss || false) {
      const uniqueDrop = rpgRollUniqueDrop(combat.band, combat.enemy.tier, combat.enemyTier, true);
      if (uniqueDrop) {
        combat.pendingLoot.push(uniqueDrop);
      } else {
        // No unique — compensate with higher-tier standard item (boss always drops something)
        const forceHighTier = true;
        const loot = rpgRollLootDrop(combat.band, combat.enemy.tier, true, forgeLevel, forceHighTier);
        if (loot) combat.pendingLoot.push(loot);
      }
    } else if (rpgShouldDropLoot(combat.enemy.tier)) {
      const loot = rpgRollLootDrop(combat.band, combat.enemy.tier, false, forgeLevel, false);
      if (loot) combat.pendingLoot.push(loot);
    }

    // Check if this was a random battle or the last quest enemy
    if (combat.isRandomBattle) {
      combat.active = false;
      rpgStat(profile, 'battlesWon', 1);
      rpgStat(profile, 'goldFromBattles', combat.goldEarned || 0);
      rpgStat(profile, 'totalDamageDealt', combat._sessionDmgDealt || 0);
      rpgStat(profile, 'totalDamageTaken', combat._sessionDmgTaken || 0);
      rpgStatMax(profile, 'biggestHit', combat._sessionBiggestHit || 0);
      rpgStatMax(profile, 'biggestHitTaken', combat._sessionBiggestHitTaken || 0);
      profile.rpg.stats.currentWinStreak = (profile.rpg.stats.currentWinStreak || 0) + 1;
      if (profile.rpg.stats.currentWinStreak > (profile.rpg.stats.longestWinStreak || 0)) {
        profile.rpg.stats.longestWinStreak = profile.rpg.stats.currentWinStreak;
      }
      // Award accumulated materials
      if (combat.pendingMaterials?.length) {
        const matSummary = rpgAwardMaterials(combat.pendingMaterials, profile);
        if (matSummary) log.push(`Materials: ${matSummary}`);
      }
      rpgSaveCombat(combat);
      const infirmaryRegen = _rpgInfirmaryRegen(pHP, stats.maxHP, profile);
      profile.rpg.currentHP = infirmaryRegen.newHP;
      rpgSaveProfile(profile);
      if (infirmaryRegen.amount > 0) log.push(`Infirmary regen: +${infirmaryRegen.amount} HP`);
      showRPGReward(combat, false);
      return;
    }

    // Quest — advance to next enemy
    const quest = RPG_QUESTS.find(q => q.id === combat.questId);
    const nextIdx = combat.enemyIndex + 1;

    if (!quest || nextIdx >= quest.enemies.length) {
      // Quest complete
      combat.active = false;

      // HP-remaining bonus
      const hpPct = pHP / stats.maxHP;
      let hpBonus = 0;
      if (hpPct >= 1.0)      hpBonus = Math.round(combat.goldEarned * 0.5);
      else if (hpPct >= 0.8) hpBonus = Math.round(combat.goldEarned * 0.3);
      else if (hpPct >= 0.6) hpBonus = Math.round(combat.goldEarned * 0.1);
      if (hpBonus > 0) {
        combat.goldEarned += hpBonus;
        log.push(`HP bonus: +${hpBonus}g`);
      }

      rpgStat(profile, 'questsCompleted', 1);
      rpgStat(profile, 'battlesWon', 1);
      rpgStat(profile, 'goldFromQuests', combat.goldEarned || 0);
      rpgStat(profile, 'totalDamageDealt', combat._sessionDmgDealt || 0);
      rpgStat(profile, 'totalDamageTaken', combat._sessionDmgTaken || 0);
      rpgStatMax(profile, 'biggestHit', combat._sessionBiggestHit || 0);
      rpgStatMax(profile, 'biggestHitTaken', combat._sessionBiggestHitTaken || 0);
      profile.rpg.stats.currentWinStreak = (profile.rpg.stats.currentWinStreak || 0) + 1;
      if (profile.rpg.stats.currentWinStreak > (profile.rpg.stats.longestWinStreak || 0)) {
        profile.rpg.stats.longestWinStreak = profile.rpg.stats.currentWinStreak;
      }
      // Award accumulated per-kill materials
      if (combat.pendingMaterials?.length) {
        const matSummary = rpgAwardMaterials(combat.pendingMaterials, profile);
        if (matSummary) log.push(`Materials: ${matSummary}`);
      }
      // Quest completion bonus materials (guaranteed)
      const quest = RPG_QUESTS.find(q => q.id === combat.questId);
      const bonusMats = rpgQuestCompletionMaterials(quest?.difficulty || 'easy');
      const bonusSummary = rpgAwardMaterials(bonusMats, profile);
      if (bonusSummary) log.push(`Quest bonus: ${bonusSummary}`);
      rpgSaveCombat(combat);
      const questRegen = _rpgInfirmaryRegen(pHP, stats.maxHP, profile);
      profile.rpg.currentHP = questRegen.newHP;
      rpgSaveProfile(profile);
      showRPGReward(combat, true);
      return;
    }

    // Next enemy in quest
    const nextEnemyDef = quest.enemies[nextIdx];
    const nextEnemy = rpgSpawnEnemy(nextEnemyDef.enemyId, stats);
    combat.enemy = nextEnemy;
    combat.isBoss = nextEnemyDef.isBoss;
    combat.enemyIndex = nextIdx;
    combat.tickPosition = { player: stats.interval, enemy: nextEnemy.interval };
    combat.bossGateBlocked = false;
  }

  rpgSaveCombat(combat);
  // Update profile HP
  profile.rpg.currentHP = pHP;
  rpgSaveProfile(profile);
  showRPGCombat();
}

// ── Flee combat ───────────────────────────────────────────────────────────────
function rpgFleeCombat() {
  const combat = rpgGetCombat();
  const profile = rpgGetProfile();
  if (combat) {
    // Keep any gold earned so far from random battles; quests lose it all on flee
    if (combat.isRandomBattle && (combat.goldEarned || 0) > 0) {
      profile.rpg.gold = (profile.rpg.gold || 0) + combat.goldEarned;
    }
    profile.rpg.currentHP = combat.playerHP;
    rpgSaveProfile(profile);
    rpgSaveCombat(null);
  }
  showRPGWilds();
}

// ── Defeat screen ─────────────────────────────────────────────────────────────
function showRPGDefeat(combat) {
  const html = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px 10px;border-bottom:1px solid var(--border)">
      <div style="width:50px"></div>
      <span style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:#EF5350">DEFEATED</span>
      <div style="width:50px"></div>
    </div>
    <div style="padding:32px 16px;text-align:center">
      <div style="font-size:48px;margin-bottom:16px">💀</div>
      <div style="font-size:15px;font-weight:500;margin-bottom:8px">You have fallen.</div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:32px">Log a workout to restore your HP and try again.</div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">Gold earned this run: ${combat.goldEarned || 0}g (lost on defeat)</div>
      <button onclick="showRPGHub()" style="
        width:100%;padding:14px;background:none;
        border:1px solid var(--border);border-radius:8px;
        color:var(--text);font-family:'DM Mono',monospace;
        font-size:13px;cursor:pointer;
      ">← Return to Hub</button>
    </div>`;

  document.getElementById('rpg-screen-body').innerHTML = html;
}

// ── Reward screen ─────────────────────────────────────────────────────────────
function showRPGReward(combat, isQuestComplete) {
  const profile = rpgGetProfile();

  // Award gold
  profile.rpg.gold = (profile.rpg.gold || 0) + (combat.goldEarned || 0);
  rpgSaveProfile(profile);
  rpgSaveCombat(null);

  const loot      = combat.pendingLoot || [];
  const matDrops  = combat.pendingMaterials || [];

  // Build materials summary for display
  const matTotals = {};
  matDrops.forEach(d => { matTotals[d.material] = (matTotals[d.material]||0) + d.qty; });
  const matSummaryHtml = Object.entries(matTotals).length > 0
    ? `<div style="margin-top:12px;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 14px">
        <div style="font-size:10px;color:var(--text-muted);letter-spacing:0.05em;margin-bottom:6px">MATERIALS FOUND</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          ${Object.entries(matTotals).map(([mat,qty]) =>
            `<span style="font-size:12px;color:var(--str)">${qty}× ${rpgMaterialLabel(mat)}</span>`
          ).join('')}
        </div>
      </div>`
    : '';
  // Track kept items for saving to inventory
  const keptItems = [];

  let lootHtml = '';
  if (loot.length > 0) {
    lootHtml = `<div style="margin-top:20px">
      <div style="font-size:11px;color:var(--text-muted);letter-spacing:0.05em;margin-bottom:10px">LOOT DROPS</div>
      ${loot.map((item, idx) => `
        <div id="loot-item-${idx}" style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
            <div>
              <div style="font-size:13px;font-weight:500">${item.name} <span style="color:var(--text-muted);font-size:10px">${rpgTierGlyphs(item.tier)}</span> +${item.tier}${item.isUnique ? ' ✦' : ''}</div>
              <div style="font-size:10px;color:var(--str);margin-top:2px">${rpgItemStatDisplay(item)}</div>
            </div>
            <button onclick="rpgRewardToggleFav(${idx})" id="fav-btn-${idx}" style="background:none;border:none;cursor:pointer;font-size:18px;padding:0">${item.favorite ? '⭐' : '☆'}</button>
          </div>
          <div style="display:flex;gap:8px" id="loot-actions-${idx}">
            <button onclick="rpgRewardKeep(${idx})" style="${rpgBtnStyle('var(--str)')}padding:8px;font-size:11px;text-align:center;flex:1">Keep</button>
            <button onclick="rpgRewardSell(${idx})" style="${rpgBtnStyle('#4CAF50')}padding:8px;font-size:11px;text-align:center;flex:1">Sell ${rpgSellPrice(item.tier, rpgBandIndex(item.band||'1-5'))}g</button>
            <button onclick="rpgRewardSalvage(${idx})" style="${rpgBtnStyle('#FFA726')}padding:8px;font-size:11px;text-align:center;flex:1">Salvage</button>
          </div>
        </div>`).join('')}
    </div>`;
  }

  const html = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px 10px;border-bottom:1px solid var(--border)">
      <div style="width:50px"></div>
      <span style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:var(--str)">${isQuestComplete ? 'QUEST COMPLETE' : 'VICTORY'}</span>
      <div style="width:50px"></div>
    </div>
    <div style="padding:16px" id="reward-screen-body">
      <div style="background:#1A1408;border:1px solid #C4732A;border-radius:10px;padding:16px;text-align:center">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">GOLD EARNED</div>
        <div style="font-family:'Syne',sans-serif;font-size:28px;font-weight:800;color:#FFA726">+${combat.goldEarned || 0}g</div>
        ${combat.battleHardenedActive ? '<div style="font-size:10px;color:var(--str);margin-top:4px">✦ Battle Hardened bonus included</div>' : ''}
      </div>
      ${matSummaryHtml}
      ${lootHtml}
      <button onclick="rpgRewardDone()" style="
        width:100%;padding:14px;margin-top:20px;
        background:var(--str);border:none;border-radius:8px;
        color:#fff;font-family:'DM Mono',monospace;
        font-size:14px;font-weight:500;cursor:pointer;
      ">Continue ›</button>
    </div>`;

  // Store loot on window for reward actions
  window._rpgRewardLoot = loot.map(i => ({...i}));
  window._rpgRewardKept = new Set();
  window._rpgRewardSold = new Set();
  window._rpgRewardSalvaged = new Set();

  document.getElementById('rpg-screen-body').innerHTML = html;
}

// Reward screen loot actions
function rpgRewardToggleFav(idx) {
  if (!window._rpgRewardLoot) return;
  window._rpgRewardLoot[idx].favorite = !window._rpgRewardLoot[idx].favorite;
  const btn = document.getElementById(`fav-btn-${idx}`);
  if (btn) btn.textContent = window._rpgRewardLoot[idx].favorite ? '⭐' : '☆';
}

function rpgRewardKeep(idx) {
  window._rpgRewardKept?.add(idx);
  rpgRewardMarkDone(idx, 'Kept ✓', 'var(--str)');
}

function rpgRewardSell(idx) {
  const item = window._rpgRewardLoot?.[idx];
  if (!item) return;
  const price = rpgSellPrice(item.tier, rpgBandIndex(item.band || '1-5'));
  const profile = rpgGetProfile();
  profile.rpg.gold = (profile.rpg.gold || 0) + price;
  rpgSaveProfile(profile);
  window._rpgRewardSold?.add(idx);
  rpgRewardMarkDone(idx, `Sold +${price}g ✓`, '#4CAF50');
}

function rpgRewardSalvage(idx) {
  const item = window._rpgRewardLoot?.[idx];
  if (!item) return;
  const salvage = item.isUnique ? rpgSalvageYieldUnique() : rpgSalvageYield(item.tier);
  const profile = rpgGetProfile();
  if (!profile.rpg.materials) profile.rpg.materials = { copper:0, iron:0, mithril:0, darksteel:0, voidShards:0 };
  profile.rpg.materials[salvage.material] = (profile.rpg.materials[salvage.material] || 0) + salvage.qty;
  rpgSaveProfile(profile);
  window._rpgRewardSalvaged?.add(idx);
  rpgRewardMarkDone(idx, `Salvaged: ${salvage.qty}× ${rpgMaterialLabel(salvage.material)} ✓`, '#FFA726');
}

function rpgRewardMarkDone(idx, label, color) {
  const actionsEl = document.getElementById(`loot-actions-${idx}`);
  if (actionsEl) actionsEl.innerHTML = `<div style="font-size:12px;color:${color};padding:8px 0">${label}</div>`;
}

function rpgRewardDone() {
  // Add kept items to inventory — also auto-keep anything not explicitly sold or salvaged
  const kept      = window._rpgRewardKept     || new Set();
  const sold      = window._rpgRewardSold      || new Set();
  const salvaged  = window._rpgRewardSalvaged  || new Set();
  const loot      = window._rpgRewardLoot      || [];

  const inv = rpgGetInventory();
  loot.forEach((item, idx) => {
    // Keep if explicitly kept, OR if the player never made a choice (not sold, not salvaged)
    if (kept.has(idx) || (!sold.has(idx) && !salvaged.has(idx))) {
      inv.push(item);
    }
  });
  if (loot.length > 0) rpgSaveInventory(inv);

  window._rpgRewardLoot      = null;
  window._rpgRewardKept      = null;
  window._rpgRewardSold      = null;
  window._rpgRewardSalvaged  = null;
  showRPGHub();
}


// ============================================================
// PHASE 4 — CASTLE & SHOP
// ============================================================

// ── Castle building definitions ───────────────────────────────────────────────
const RPG_CASTLE_BUILDINGS = [
  { id:'barracks',        name:'Barracks',         maxLevel:5, icon:'⚔️',
    desc: (lvl) => lvl === 0 ? 'Increases attack damage.' : `+${lvl*3}% ATK damage`,
    next: (lvl) => `+${(lvl+1)*3}% ATK damage` },
  { id:'infirmary',       name:'Infirmary',         maxLevel:5, icon:'🏥',
    desc: (lvl) => lvl === 0 ? 'Post-fight HP regen.' : `+${lvl*3}% max HP regen after each fight`,
    next: (lvl) => `+${(lvl+1)*3}% HP regen after fights` },
  { id:'training_grounds',name:'Training Grounds',  maxLevel:5, icon:'🏋️',
    desc: (lvl) => lvl === 0 ? 'Increases max HP.' : `+${lvl*10}% max HP`,
    next: (lvl) => `+${(lvl+1)*10}% max HP` },
  { id:'vault',           name:'Vault',             maxLevel:5, icon:'💰',
    desc: (lvl) => lvl === 0 ? 'Increases gold from combat.' : `+${lvl*5}% gold from all combat`,
    next: (lvl) => `+${(lvl+1)*5}% combat gold` },
  { id:'watchtower',      name:'Watchtower',        maxLevel:3, icon:'🗼',
    desc: (lvl) => ['Reveals nothing yet.','Reveals enemy ATK and HP.','Also reveals enemy gold drop.','Reveals difficulty score.'][lvl],
    next: (lvl) => ['Reveals enemy ATK and HP.','Also reveals gold drop.','Reveals difficulty score.'][lvl] },
  { id:'trophy_hall',     name:'Trophy Hall',       maxLevel:3, icon:'🏆',
    desc: (lvl) => lvl === 0 ? 'Displays earned achievements.' : `${lvl} achievement display${lvl>1?'s':''}`,
    next: (lvl) => `${lvl+1} achievement display${lvl+1>1?'s':''}` },
  { id:'apothecary',      name:'Apothecary',        maxLevel:2, icon:'⚗️',
    desc: (lvl) => `Ember Tonic cap: ${1+lvl}`,
    next: (lvl) => `Ember Tonic cap: ${2+lvl}` },
  { id:'herbalist',       name:'Herbalist',         maxLevel:5, icon:'🌿',
    desc: (lvl) => `Ember Tonic heals ${[25,30,35,40,45,50][lvl]}% max HP`,
    next: (lvl) => `Heals ${[30,35,40,45,50][lvl]}% max HP` },
  { id:'forge',           name:'Forge',             maxLevel:5, icon:'🔨',
    desc: (lvl) => lvl === 0 ? 'Standard loot weights.' : `+${lvl} tier weight to loot drops`,
    next: (lvl) => `+${lvl+1} tier weight shift` },
  { id:'market',          name:'Market',            maxLevel:3, icon:'🛒',
    desc: (lvl) => [`3 shop items daily.`,`4 shop items daily.`,`5 shop items daily.`,`5 items + 1 high-tier daily.`][lvl],
    next: (lvl) => [`4 shop items daily.`,`5 shop items daily.`,`5 items + 1 high-tier daily.`][lvl] },
];

// ── Infirmary post-fight HP regen ─────────────────────────────────────────────
// Called after every fight win. Heals % of max HP based on Infirmary level.
// Level 0 = no regen. Level 1-5 = 3/6/9/12/15% of max HP.
function _rpgInfirmaryRegen(currentHP, maxHP, profile) {
  const infirmaryLvl = profile.rpg.castle?.infirmary || 0;
  const infirmaryAmt = infirmaryLvl > 0 ? Math.round(maxHP * infirmaryLvl * 0.03) : 0;
  // Resilience passive stacks additively with Infirmary
  const ap = rpgComputeActivePassives(profile);
  const resilienceAmt = ap.resilience ? ap.resilience.hp : 0;
  const totalAmt = infirmaryAmt + resilienceAmt;
  if (totalAmt === 0) return { newHP: currentHP, amount: 0 };
  const newHP = Math.min(maxHP, currentHP + totalAmt);
  return { newHP, amount: newHP - currentHP };
}


function showRPGCastle() {
  try {
  const profile = rpgGetProfile();
  const gold    = profile.rpg.gold || 0;
  const castle  = profile.rpg.castle || {};

  const buildingCards = RPG_CASTLE_BUILDINGS.map(b => {
    const lvl      = castle[b.id] || 0;
    const isMax    = lvl >= b.maxLevel;
    const cost     = isMax ? null : rpgCastleUpgradeCost(lvl);
    const canAfford = cost !== null && gold >= cost;

    return `<div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:20px">${b.icon}</span>
          <div>
            <div style="font-size:14px;font-weight:500">${b.name}</div>
            <div style="font-size:10px;color:var(--text-muted)">Level ${lvl} / ${b.maxLevel}</div>
          </div>
        </div>
        ${isMax ? `<span style="font-size:10px;color:var(--str);background:var(--str)22;padding:2px 8px;border-radius:4px">MAXED</span>` : ''}
      </div>
      <div style="font-size:12px;color:var(--text);margin-bottom:${isMax?'0':'10px'}">${b.desc(lvl)}</div>
      ${!isMax ? `
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px">Next: ${b.next(lvl)}</div>
        <button onclick="rpgUpgradeBuilding('${b.id}')" ${canAfford?'':'disabled'} style="
          width:100%;padding:10px;background:none;
          border:1px solid ${canAfford?'var(--str)':'var(--border)'};
          border-radius:8px;color:${canAfford?'var(--str)':'var(--text-muted)'};
          font-family:'DM Mono',monospace;font-size:12px;cursor:${canAfford?'pointer':'default'};
        ">${canAfford ? `Upgrade — ${cost.toLocaleString()}g` : `${(cost||0).toLocaleString()}g needed`}</button>
      ` : ''}
    </div>`;
  }).join('');

  const html = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px 10px;border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--card);z-index:10">
      <button onclick="showRPGHub()" style="background:none;border:none;color:var(--text-muted);font-family:'DM Mono',monospace;font-size:13px;cursor:pointer;padding:0">← Hub</button>
      <span style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:var(--str)">THE CASTLE</span>
      <div style="font-size:12px;color:#FFA726">${gold.toLocaleString()}g</div>
    </div>
    <div style="padding:16px">${buildingCards}</div>`;

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('rpg-screen-body').innerHTML = html;
  document.getElementById('screen-rpg').classList.add('active');
  if (typeof setActiveNav === 'function') setActiveNav('bnav-rpg');
  } catch(e) {
    console.error('showRPGCastle error:', e);
    const body = document.getElementById('rpg-screen-body');
    if (body) body.innerHTML = `<div style="padding:24px;color:#EF5350;font-family:'DM Mono',monospace;font-size:12px">Castle error: ${e.message}<br><br>Check browser console for details.</div>`;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-rpg').classList.add('active');
    if (typeof setActiveNav === 'function') setActiveNav('bnav-rpg');
  }
}

function rpgUpgradeBuilding(buildingId) {
  const profile  = rpgGetProfile();
  const building = RPG_CASTLE_BUILDINGS.find(b => b.id === buildingId);
  if (!building) return;
  const lvl = (profile.rpg.castle[buildingId] || 0);
  if (lvl >= building.maxLevel) return;
  const cost = rpgCastleUpgradeCost(lvl);
  if (cost === null || (profile.rpg.gold || 0) < cost) {
    alert(`Not enough gold.  You need ${(cost||0).toLocaleString()}g.`);
    return;
  }
  profile.rpg.gold -= cost;
  rpgStat(profile, 'goldSpentCastle', cost);
  profile.rpg.castle[buildingId] = lvl + 1;
  rpgSaveProfile(profile);
  showRPGCastle();
}

// ── SHOP SCREEN ───────────────────────────────────────────────────────────────

function rpgGenerateShopItems(profile, stats) {
  const castle    = profile.rpg.castle || {};
  const marketLvl = castle.market || 0;
  const forgeLvl  = castle.forge  || 0;
  const band      = rpgLevelBand(stats.level);
  const bandIdx   = rpgBandIndex(band);
  const bands     = ['1-5','6-10','11-15','16-20','21-25','26-30','31-35','36-40','41-45','46-50'];
  const nextBand  = bands[Math.min(bandIdx+1, 9)];
  const slotCount = [3,4,5,5][marketLvl] || 3;

  // Deterministic seed — same stock all day
  const today = new Date().toISOString().slice(0,10);
  let seedVal = [...(today + stats.level)].reduce((a,c) => a + c.charCodeAt(0), 0);
  const sr = () => { seedVal = (seedVal * 1664525 + 1013904223) & 0xffffffff; return Math.abs(seedVal) / 0xffffffff; };

  // Tier weights for regular slots — market level shifts bias away from tier 1
  // [tier1, tier2, tier3, tier4, tier5]
  const regularWeights = [
    [60, 28, 10,  2,  0],  // market 0 — heavy tier 1
    [45, 32, 16,  7,  0],  // market 1
    [30, 32, 24, 14,  0],  // market 2
    [20, 28, 28, 20,  4],  // market 3+
  ][Math.min(marketLvl, 3)].map((w, ti) => ti > 0 ? w + forgeLvl * 2 : w);

  // Guaranteed high-tier slot weights (last slot, market 3+ only)
  // Always tier 3–5, heavier toward 4–5 at max market
  const guaranteedWeights = marketLvl >= 3 ? [0, 0, 35, 45, 20] : null;

  const slots = ['weapon','shield','helmet','body_armor','boots','jewelry'];

  function rollTier(weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = sr() * total;
    for (let t = 0; t < weights.length; t++) {
      r -= weights[t];
      if (r <= 0) return t + 1;
    }
    return weights.length;
  }

  return Array.from({ length: slotCount }, (_, i) => {
    const isGuaranteed = guaranteedWeights && i === slotCount - 1;
    const useBand = sr() < 0.8 ? band : nextBand;
    const slot    = slots[Math.floor(sr() * slots.length)];
    const mats    = RPG_BAND_MATERIALS[useBand] || ['Copper'];
    const mat     = mats[Math.floor(sr() * mats.length)];
    const types   = RPG_SLOT_TYPES[slot] || ['Item'];
    const type    = types[Math.floor(sr() * types.length)];
    const tier    = isGuaranteed ? rollTier(guaranteedWeights) : rollTier(regularWeights);
    const bidx    = rpgBandIndex(useBand);
    const scale   = RPG_GEAR_SCALE[slot] || RPG_GEAR_SCALE.weapon;
    const baseV   = scale.base[bidx] + (tier - 1) * scale.inc[bidx];
    const rolled  = Math.max(1, Math.round(baseV * (0.9 + sr() * 0.2)));
    const rs = {};
    const ps = RPG_SLOT_STAT[slot];
    if (ps==='STR') rs.effectiveSTR=rolled;
    else if(ps==='END') rs.effectiveEND=rolled;
    else if(ps==='AGI') rs.effectiveAGI=rolled;
    else if(ps==='DEX') rs.effectiveDEX=rolled;
    if (slot==='body_armor'){const hs=RPG_GEAR_SCALE.body_armor_hp;rs.flatHP=Math.max(1,Math.round((hs.base[bidx]+(tier-1)*hs.inc[bidx])*(0.9+sr()*0.2)));}
    let name = `${mat} ${type}`;
    if (slot==='jewelry'){
      const gk=Object.keys(RPG_JEWELRY_GEMS);
      const gemKey=gk[Math.floor(sr()*gk.length)];
      const gm=RPG_JEWELRY_GEMS[gemKey];
      name=`${mat} ${gm} ${type}`;
      if(gemKey==='STR') rs.effectiveSTR=rolled;
      else if(gemKey==='END') rs.effectiveEND=rolled;
      else if(gemKey==='AGI') rs.effectiveAGI=rolled;
      else rs.effectiveDEX=rolled;
    }
    return { instanceId:`shop_${rpgUUID()}_${today}`, name, slot, band:useBand, tier, rolledStats:rs,
             isUnique:false, favorite:false, price:rpgItemPrice(tier,bidx), acquiredAt:today,
             isGuaranteed: isGuaranteed || false };
  });
}

function showRPGShop() {
  const profile   = rpgGetProfile();
  const stats     = rpgPlayerStats(profile);
  const gold      = profile.rpg.gold || 0;
  const castle    = profile.rpg.castle || {};
  const tonicMax  = 1 + (castle.apothecary || 0);
  const tonics    = profile.rpg.emberTonics || 0;
  const tonicRoom = tonicMax - tonics;
  const tonicPct  = Math.round(rpgTonicHealPct(profile) * 100);
  const shopItems = rpgGenerateShopItems(profile, stats);
  // Filter out already-purchased items for today
  const today2 = new Date().toISOString().slice(0,10);
  const purchased = (profile.rpg.shopPurchased?.[today2]) || [];
  const availableItems = shopItems.filter((_, idx) => !purchased.includes(idx));
  window._rpgShopItems = shopItems; // keep full array so indices stay stable

  const itemCards = availableItems.length === 0
    ? `<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px;font-style:italic">All items purchased today.<br>Stock refreshes at midnight.</div>`
    : availableItems.map((item) => {
        const idx = shopItems.indexOf(item); // use original index for buy action
        const canAfford = gold >= item.price;
        const statLine  = rpgItemStatDisplay(item);
        return `<div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
            <div>
              <div style="font-size:13px;font-weight:500">${item.name} <span style="color:var(--text-muted);font-size:10px">${rpgTierGlyphs(item.tier)}</span> +${item.tier}${item.isGuaranteed ? ' <span style="font-size:9px;color:#FFA726;background:#FFA72622;padding:1px 5px;border-radius:3px;letter-spacing:0.05em">FEATURED</span>' : ''}</div>
              <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${rpgSlotLabel(item.slot)} · ${item.band} band</div>
              <div style="font-size:11px;color:var(--str);margin-top:3px">${statLine}</div>
            </div>
            <div style="font-size:14px;color:#FFA726;font-weight:500;white-space:nowrap">${item.price.toLocaleString()}g</div>
          </div>
          <button onclick="rpgBuyItem(${idx})" ${canAfford?'':'disabled'} style="
            width:100%;padding:9px;background:none;
            border:1px solid ${canAfford?'var(--str)':'var(--border)'};
            border-radius:7px;color:${canAfford?'var(--str)':'var(--text-muted)'};
            font-family:'DM Mono',monospace;font-size:12px;cursor:${canAfford?'pointer':'default'};
          ">${canAfford?'Buy':'Need '+(item.price-gold).toLocaleString()+'g more'}</button>
        </div>`;
      }).join('');

  const tonicSection = `
    <div style="padding-top:16px;border-top:1px solid var(--border);margin-top:4px">
      <div style="font-size:11px;color:var(--text-muted);letter-spacing:0.05em;margin-bottom:10px">CONSUMABLES</div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px">
        <div style="font-size:13px;font-weight:500;margin-bottom:4px">🧪 Ember Tonic</div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px">Restores ${tonicPct}% max HP mid-combat.  You have ${tonics}/${tonicMax} charges.</div>
        <div style="display:flex;gap:8px">
          <button onclick="rpgBuyTonic(1)" ${tonicRoom>=1&&gold>=250?'':'disabled'} style="
            flex:1;padding:9px;background:none;
            border:1px solid ${tonicRoom>=1&&gold>=250?'var(--str)':'var(--border)'};
            border-radius:7px;color:${tonicRoom>=1&&gold>=250?'var(--str)':'var(--text-muted)'};
            font-family:'DM Mono',monospace;font-size:11px;cursor:${tonicRoom>=1&&gold>=250?'pointer':'default'};
          ">1 charge · 250g</button>
          <button onclick="rpgBuyTonic(3)" ${tonicRoom>=1&&gold>=600?'':'disabled'} style="
            flex:1;padding:9px;background:none;
            border:1px solid ${tonicRoom>=1&&gold>=600?'#FFA726':'var(--border)'};
            border-radius:7px;color:${tonicRoom>=1&&gold>=600?'#FFA726':'var(--text-muted)'};
            font-family:'DM Mono',monospace;font-size:11px;cursor:${tonicRoom>=1&&gold>=600?'pointer':'default'};
          ">Bundle · 600g</button>
        </div>
        ${tonicRoom===0?'<div style="font-size:10px;color:var(--text-muted);margin-top:8px;text-align:center">Tonics full — upgrade Apothecary for more capacity</div>':''}
      </div>
    </div>`;

  const html = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px 10px;border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--card);z-index:10">
      <button onclick="showRPGHub()" style="background:none;border:none;color:var(--text-muted);font-family:'DM Mono',monospace;font-size:13px;cursor:pointer;padding:0">← Hub</button>
      <span style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:var(--str)">SHOP</span>
      <div style="font-size:12px;color:#FFA726">${gold.toLocaleString()}g</div>
    </div>
    <div style="padding:16px">
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:14px">Stock refreshes daily at midnight.</div>
      ${itemCards}
      ${tonicSection}
    </div>`;

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('rpg-screen-body').innerHTML = html;
  document.getElementById('screen-rpg').classList.add('active');
  if (typeof setActiveNav === 'function') setActiveNav('bnav-rpg');
}

function rpgBuyItem(idx) {
  const item = window._rpgShopItems?.[idx];
  if (!item) return;
  const profile = rpgGetProfile();
  if ((profile.rpg.gold||0) < item.price) { alert('Not enough gold.'); return; }
  profile.rpg.gold -= item.price;
  rpgStat(profile, 'goldSpentShop', item.price);
  rpgStat(profile, 'itemsBought', 1);
  // Track purchased slot so it disappears from shop
  const today = new Date().toISOString().slice(0,10);
  if (!profile.rpg.shopPurchased) profile.rpg.shopPurchased = {};
  if (!profile.rpg.shopPurchased[today]) profile.rpg.shopPurchased[today] = [];
  profile.rpg.shopPurchased[today].push(idx);
  rpgSaveProfile(profile);
  const inv = rpgGetInventory();
  const owned = { ...item, instanceId: rpgUUID() };
  delete owned.price;
  inv.push(owned);
  rpgSaveInventory(inv);
  showRPGShop();
}

function rpgBuyTonic(qty) {
  const profile  = rpgGetProfile();
  const tonicMax = 1 + (profile.rpg.castle?.apothecary || 0);
  const current  = profile.rpg.emberTonics || 0;
  const room     = tonicMax - current;
  if (room <= 0) { alert('Tonic charges are full.'); return; }
  const cost = qty === 1 ? 250 : 600;
  if ((profile.rpg.gold||0) < cost) { alert('Not enough gold.'); return; }
  profile.rpg.gold -= cost;
  rpgStat(profile, 'goldSpentShop', cost);
  profile.rpg.emberTonics = Math.min(tonicMax, current + Math.min(qty, room));
  rpgSaveProfile(profile);
  showRPGShop();
}


// ============================================================
// FORGE SYSTEM
// ============================================================

// Upgrade cost for a given current tier
function rpgForgeUpgradeCost(tier) {
  const gold = 50 * Math.pow(2, tier - 1);
  let mat, qty;
  if (tier <= 3)      { mat = 'copper';    qty = 1; }
  else if (tier <= 4) { mat = 'iron';      qty = 1; }
  else if (tier <= 5) { mat = 'iron';      qty = 2; }
  else if (tier <= 6) { mat = 'mithril';   qty = 1; }
  else if (tier <= 7) { mat = 'mithril';   qty = 2; }
  else if (tier <= 8) { mat = 'darksteel'; qty = 1; }
  else                { mat = 'darksteel'; qty = 2; }
  return { gold, mat, qty };
}

function rpgForgeUniqueUpgradeCost(tier) {
  const gold = 50 * Math.pow(2, tier - 1);
  return { gold, mat: 'voidShards', qty: tier <= 2 ? 1 : 2 };
}

function rpgCanForgeUpgrade(inst, profile) {
  if (!inst) return { can: false, reason: 'No item' };
  const mats = profile.rpg.materials || {};
  const cost = inst.isUnique
    ? rpgForgeUniqueUpgradeCost(inst.tier)
    : rpgForgeUpgradeCost(inst.tier);
  if (inst.tier >= 10) return { can: false, reason: 'Already +10' };
  if ((profile.rpg.gold || 0) < cost.gold) return { can: false, reason: `Need ${cost.gold.toLocaleString()}g` };
  if ((mats[cost.mat] || 0) < cost.qty) return { can: false, reason: `Need ${cost.qty}× ${rpgMaterialLabel(cost.mat)}` };
  return { can: true, cost };
}

function showRPGForge() {
  const profile = rpgGetProfile();
  const inv     = rpgGetInventory();
  const gold    = profile.rpg.gold || 0;
  const mats    = profile.rpg.materials || {};
  const forgeLvl = profile.rpg.castle?.forge || 0;

  // Sort: equipped first → favorites → uniques → tier desc
  const equipped = profile.rpg.equipped || {};
  const equippedIds = new Set(Object.values(equipped).filter(Boolean).map(e => e.instanceId));

  const sortedInv = [...inv].sort((a, b) => {
    const aEq = equippedIds.has(a.instanceId) ? 0 : 1;
    const bEq = equippedIds.has(b.instanceId) ? 0 : 1;
    if (aEq !== bEq) return aEq - bEq;
    if (b.favorite && !a.favorite) return 1;
    if (a.favorite && !b.favorite) return -1;
    if (b.isUnique && !a.isUnique) return 1;
    if (a.isUnique && !b.isUnique) return -1;
    return b.tier - a.tier;
  });

  const matRows = [
    ['copper',    'Copper Bar',    mats.copper    || 0, '#CD7F32'],
    ['iron',      'Iron Bar',      mats.iron      || 0, '#9E9E9E'],
    ['mithril',   'Mithril Bar',   mats.mithril   || 0, '#64B5F6'],
    ['darksteel', 'Darksteel Bar', mats.darksteel || 0, '#CE93D8'],
    ['voidShards','Void Shard',    mats.voidShards|| 0, '#FFA726'],
  ].map(([key,label,qty,col]) =>
    `<div style="display:flex;justify-content:space-between;padding:7px 12px;border-top:1px solid var(--border)">
      <span style="font-size:11px;color:var(--text-muted)">${label}</span>
      <span style="font-size:12px;font-weight:500;color:${qty>0?col:'var(--text-muted)'}">${qty}</span>
    </div>`
  ).join('');

  const itemRows = sortedInv.map(inst => {
    const { can, cost, reason } = rpgCanForgeUpgrade(inst, profile);
    const statLine   = rpgItemStatDisplay(inst);
    const isEquipped = equippedIds.has(inst.instanceId);
    const statusBadge = isEquipped
      ? `<span style="font-size:10px;color:var(--str);background:var(--str)22;padding:1px 6px;border-radius:3px;margin-left:6px">equipped</span>`
      : inst.favorite ? '' : '';
    return `<div onclick="rpgShowForgeSheet('${inst.instanceId}')" style="
      background:var(--surface);
      border:1px solid ${isEquipped ? 'var(--str)' : inst.isUnique ? '#CE93D8' : 'var(--border)'};
      border-radius:8px;padding:12px;margin-bottom:8px;cursor:pointer;
      display:flex;align-items:center;justify-content:space-between;
    ">
      <div style="flex:1">
        <div style="font-size:13px;font-weight:500">
          ${inst.name} <span style="color:var(--text-muted);font-size:10px">${rpgTierGlyphs(inst.tier)}</span> +${inst.tier}${inst.isUnique?' ✦':''}${inst.favorite?' ⭐':''}
          ${statusBadge}
        </div>
        <div style="font-size:10px;color:var(--str);margin-top:2px">${statLine}</div>
        ${inst.isUnique && inst.passive ? `<div style="font-size:10px;color:#CE93D8;margin-top:2px">✦ ${inst.passive.desc}</div>` : ''}
        <div style="font-size:10px;color:${can?'var(--text-muted)':'#EF5350'};margin-top:4px">
          ${inst.tier >= 10 ? 'Maximum tier' : can ? `→ +${inst.tier+1}: ${cost.gold.toLocaleString()}g + ${cost.qty}× ${rpgMaterialLabel(cost.mat)}` : reason}
        </div>
      </div>
      <span style="color:var(--text-muted);font-size:16px;margin-left:8px">›</span>
    </div>`;
  }).join('');

  const html = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px 10px;border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--card);z-index:10">
      <button onclick="showRPGCastle()" style="background:none;border:none;color:var(--text-muted);font-family:'DM Mono',monospace;font-size:13px;cursor:pointer;padding:0">← Castle</button>
      <span style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:var(--str)">FORGE</span>
      <div style="font-size:12px;color:#FFA726">${gold.toLocaleString()}g</div>
    </div>
    <div style="padding:16px">
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:14px">Upgrade items using gold and crafting materials.  Unique items require Void Shards only.  Forge level ${forgeLvl} — shifting loot weights toward higher tiers.</div>

      <!-- Materials -->
      <div style="margin-bottom:16px">
        <div style="font-size:10px;color:var(--text-muted);letter-spacing:0.05em;margin-bottom:6px">YOUR MATERIALS</div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden">
          ${matRows}
        </div>
      </div>

      <!-- Items -->
      <div style="font-size:10px;color:var(--text-muted);letter-spacing:0.05em;margin-bottom:10px">YOUR ITEMS (${inv.length})</div>
      ${inv.length === 0
        ? '<div style="text-align:center;padding:32px;color:var(--text-muted);font-size:13px;font-style:italic">No items in inventory yet.<br>Win battles and complete quests to find gear.</div>'
        : itemRows}
    </div>`;

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('rpg-screen-body').innerHTML = html;
  document.getElementById('screen-rpg').classList.add('active');
  if (typeof setActiveNav === 'function') setActiveNav('bnav-rpg');
}

function rpgShowForgeSheet(instanceId) {
  const inv     = rpgGetInventory();
  const inst    = inv.find(i => i.instanceId === instanceId);
  if (!inst) return;
  const profile = rpgGetProfile();
  const { can, cost, reason } = rpgCanForgeUpgrade(inst, profile);

  if (inst.tier >= 10) {
    rpgShowSheet(`<div style="padding:24px 20px;text-align:center">
      <div style="font-size:15px;font-weight:500;margin-bottom:8px">${inst.name} <span style="color:var(--text-muted);font-size:11px">${rpgTierGlyphs(inst.tier)}</span> +${inst.tier}</div>
      <div style="font-size:13px;color:var(--str)">Already at maximum tier.</div>
      <button onclick="rpgDismissSheet()" style="margin-top:20px;${rpgBtnStyle('var(--border)')}text-align:center">Close</button>
    </div>`);
    return;
  }

  // Compute projected stats at next tier
  const bandIdx  = rpgBandIndex(inst.band || '1-5');
  const slot     = inst.slot;
  const scale    = RPG_GEAR_SCALE[slot] || RPG_GEAR_SCALE.weapon;
  const nextTier = inst.tier + 1;

  const statKeys = ['effectiveSTR','effectiveEND','effectiveAGI','effectiveDEX','flatHP'];
  const statNames = { effectiveSTR:'STR', effectiveEND:'END', effectiveAGI:'AGI', effectiveDEX:'DEX', flatHP:'HP' };

  const currentStats = inst.rolledStats || {};
  // Project next tier stats — derive primary key from whichever stat the item actually has
  const projectedStats = { ...currentStats };
  const statKeyMap = { STR:'effectiveSTR', END:'effectiveEND', AGI:'effectiveAGI', DEX:'effectiveDEX' };
  // Find which primary stat key this item has (first non-zero match)
  const primaryKey = ['effectiveSTR','effectiveEND','effectiveAGI','effectiveDEX'].find(k => currentStats[k]) || 'effectiveDEX';
  const baseVal = scale.base[bandIdx] + (nextTier - 1) * scale.inc[bandIdx];
  projectedStats[primaryKey] = Math.max(currentStats[primaryKey] || 0, Math.round(baseVal * 0.95));
  if (slot === 'body_armor' && currentStats.flatHP) {
    const hs = RPG_GEAR_SCALE.body_armor_hp;
    const hpBase = hs.base[bandIdx] + (nextTier - 1) * hs.inc[bandIdx];
    projectedStats.flatHP = Math.max(currentStats.flatHP, Math.round(hpBase * 0.95));
  }

  // Passive change for uniques
  let passiveHtml = '';
  if (inst.isUnique && inst.passive) {
    const bandGroup   = rpgBandGroup(inst.band || '1-5');
    const nextPassive = rpgPassiveValue(inst.passive.type, bandGroup, nextTier);
    passiveHtml = `
      <div style="padding:8px 0;border-top:1px solid var(--border)">
        <div style="font-size:10px;color:var(--text-muted);margin-bottom:3px">PASSIVE</div>
        <div style="font-size:11px;color:var(--text-muted);text-decoration:line-through">${inst.passive.desc}</div>
        <div style="font-size:11px;color:#CE93D8;margin-top:3px">→ ${nextPassive.desc}</div>
      </div>`;
  }

  // Stat comparison rows
  const presentKeys = [...new Set([...Object.keys(currentStats), ...Object.keys(projectedStats)])].filter(k => statKeys.includes(k));
  const statRows = presentKeys.map(k => {
    const cur  = currentStats[k]  || 0;
    const next = projectedStats[k] || 0;
    const delta = next - cur;
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-top:1px solid var(--border)">
      <span style="font-size:11px;color:var(--text-muted)">${statNames[k]}</span>
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:12px">${cur}</span>
        <span style="font-size:11px;color:var(--text-muted)">→</span>
        <span style="font-size:12px;font-weight:500;color:#4CAF50">${next}</span>
        ${delta > 0 ? `<span style="font-size:10px;color:#4CAF50">(+${delta})</span>` : ''}
      </div>
    </div>`;
  }).join('');

  rpgShowSheet(`
    <div style="padding:20px 20px 8px">
      <div style="font-size:15px;font-weight:500">${inst.name} <span style="color:var(--text-muted);font-size:11px">${rpgTierGlyphs(inst.tier)}</span> +${inst.tier} → +${nextTier}</div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:3px">${rpgSlotLabel(slot)} · ${inst.band} band${inst.isUnique ? ' · Unique ✦' : ''}</div>
    </div>

    <!-- Stat comparison -->
    <div style="padding:0 20px 12px">
      <div style="font-size:10px;color:var(--text-muted);letter-spacing:0.05em;margin-bottom:6px">STAT CHANGES</div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:0 12px">
        ${statRows}
        ${passiveHtml}
      </div>
    </div>

    <!-- Cost -->
    <div style="padding:0 20px 16px">
      <div style="font-size:10px;color:var(--text-muted);letter-spacing:0.05em;margin-bottom:6px">UPGRADE COST</div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:12px;color:var(--text-muted)">Gold</span>
          <span style="font-size:13px;font-weight:500;color:${can?'#FFA726':'#EF5350'}">${(cost||{gold:0}).gold?.toLocaleString() || 0}g</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;border-top:1px solid var(--border);padding-top:8px">
          <span style="font-size:12px;color:var(--text-muted)">Material</span>
          <span style="font-size:13px;font-weight:500;color:${can?'var(--str)':'#EF5350'}">${cost ? `${cost.qty}× ${rpgMaterialLabel(cost.mat)}` : reason}</span>
        </div>
        ${!can ? `<div style="font-size:11px;color:#EF5350;margin-top:8px;text-align:center">${reason}</div>` : ''}
      </div>
    </div>

    <!-- Actions -->
    <div style="padding:0 20px 8px;display:flex;gap:10px">
      <button onclick="rpgDismissSheet()" style="${rpgBtnStyle('var(--border)')}flex:1;text-align:center">Cancel</button>
      <button onclick="rpgForgeUpgrade('${instanceId}')" ${can?'':'disabled'} style="${rpgBtnStyle(can?'var(--str)':'var(--border)')}flex:2;text-align:center;color:${can?'var(--str)':'var(--text-muted)'}">
        ${can ? `Upgrade to +${nextTier}` : 'Cannot upgrade'}
      </button>
    </div>
  `);
}

function rpgForgeUpgrade(instanceId) {
  const inv   = rpgGetInventory();
  const inst  = inv.find(i => i.instanceId === instanceId);
  if (!inst) return;
  const profile = rpgGetProfile();
  const { can, cost } = rpgCanForgeUpgrade(inst, profile);
  if (!can) return;

  // Deduct costs
  profile.rpg.gold -= cost.gold;
  profile.rpg.materials[cost.mat] -= cost.qty;
  rpgStat(profile, 'goldSpentCastle', cost.gold); // counts as castle spend

  // Upgrade the item tier
  inst.tier += 1;

  // If unique, also upgrade the passive value
  if (inst.isUnique && inst.passive) {
    const bandGroup = rpgBandGroup(inst.band || '1-5');
    inst.passive = rpgPassiveValue(inst.passive.type, bandGroup, inst.tier);
  }

  // Re-roll stat slightly upward for the new tier
  const bandIdx = rpgBandIndex(inst.band || '1-5');
  const slot    = inst.slot;
  const scale   = RPG_GEAR_SCALE[slot] || RPG_GEAR_SCALE.weapon;
  ['effectiveSTR','effectiveEND','effectiveAGI','effectiveDEX'].forEach(key => {
    if (inst.rolledStats[key]) {
      const newBase = scale.base[bandIdx] + (inst.tier - 1) * scale.inc[bandIdx];
      inst.rolledStats[key] = Math.max(inst.rolledStats[key], Math.round(newBase * 0.95));
    }
  });
  if (inst.rolledStats.flatHP) {
    const hs = RPG_GEAR_SCALE.body_armor_hp;
    const newBase = hs.base[bandIdx] + (inst.tier - 1) * hs.inc[bandIdx];
    inst.rolledStats.flatHP = Math.max(inst.rolledStats.flatHP, Math.round(newBase * 0.95));
  }

  rpgSaveInventory(inv);
  rpgSaveProfile(profile);

  // If this item is equipped, recompute active passives on any active combat
  const combat = rpgGetCombat();
  if (combat?.active) {
    combat.activePassives = rpgComputeActivePassives(profile);
    rpgSaveCombat(combat);
  }

  rpgDismissSheet();
  showRPGForge();
}

// ── Close RPG, return to training ────────────────────────────────────────────

function closeRPG() {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-home').classList.add('active');
  showHome();
}

// ── Entry point called by openRPG() in ppl_workout.html ──────────────────────

// Retroactive gold: award half composite XP for all existing sessions
// on first ever RPG load (profile.rpg didn't exist before)
function rpgInitRetroactiveGold(profile) {
  if (profile.rpg._retroDone) return;
  let totalGold = 0;
  let runningPBs = {};
  sessions.forEach((s, idx) => {
    const prior = sessions.slice(0, idx);
    const { attrGains } = calcSessionXP(s, prior, runningPBs);
    const compositeXP = Object.values(attrGains).reduce((a, b) => a + b, 0);
    totalGold += Math.floor(compositeXP / 2);
    // update running PBs
    s.exercises.forEach(ex => {
      if (!runningPBs[ex.name]) runningPBs[ex.name] = { weight:0, reps:0 };
      ex.sets.forEach(st => {
        const w = parseFloat(st.weight)||0, r = parseFloat(st.reps)||0;
        if (w > runningPBs[ex.name].weight) runningPBs[ex.name].weight = w;
        if (r > runningPBs[ex.name].reps) runningPBs[ex.name].reps = r;
      });
    });
  });
  profile.rpg.gold = totalGold;
  profile.rpg._retroDone = true;
  rpgSaveProfile(profile);
  console.log(`RPG: retroactive gold awarded — ${totalGold}g from ${sessions.length} sessions`);
}

window.rpgLoaded = true;

// ── Mid-combat workout hook ───────────────────────────────────────────────────
// Called from ppl_workout.html after a session is saved (gold hook already runs)
// Handles heal (random battle) or Battle Hardened (quest)
function rpgOnWorkoutSaved(sessionType) {
  const combat  = rpgGetCombat();
  const profile = rpgGetProfile();
  const stats   = rpgPlayerStats(profile);

  // Always apply stat boost
  profile.rpg.statBoost = {
    type: sessionType,
    appliedAt: new Date().toISOString(),
  };

  if (!combat || !combat.active) {
    // No active combat — heal to full (random battle context)
    const prevHP = profile.rpg.currentHP || stats.maxHP;
    profile.rpg.currentHP = stats.maxHP;
    rpgSaveProfile(profile);
    // Animate HP bar if on combat/hub screen
    requestAnimationFrame(() => {
      const bar = document.getElementById('player-hp-bar');
      if (bar) bar.style.width = '100%';
    });
    return;
  }

  if (combat.isRandomBattle) {
    // Heal to full in random battles
    const oldHP = combat.playerHP;
    combat.playerHP = stats.maxHP;
    combat.battleLog.push(`Workout logged!  Healed to full HP.  Stat boost: ${sessionType}.`);
    rpgSaveCombat(combat);
    profile.rpg.currentHP = stats.maxHP;
    rpgSaveProfile(profile);
    // Animate HP bar fill
    requestAnimationFrame(() => {
      const bar = document.getElementById('player-hp-bar');
      if (bar) {
        bar.style.transition = 'width 1.5s ease';
        bar.style.width = '100%';
        bar.style.background = '#4CAF50';
      }
    });
    setTimeout(() => showRPGCombat(), 100);
  } else {
    // Quest — Battle Hardened buff, no heal
    combat.goldMultiplier = 1.25;
    combat.battleHardenedActive = true;
    combat.battleLog.push(`Workout logged!  Battle Hardened: +25% gold for remaining enemies.  Stat boost: ${sessionType}.`);
    rpgSaveCombat(combat);
    rpgSaveProfile(profile);
    setTimeout(() => showRPGCombat(), 100);
  }
}

// Run retroactive gold on first load
(function() {
  const p = rpgGetProfile();
  if (!p.rpg._retroDone) rpgInitRetroactiveGold(p);
})();

showRPGHub();

// Patch renderHomeRPGWidget to also show RPG gold + tonics
const _origRenderHomeRPGWidget = renderHomeRPGWidget;
renderHomeRPGWidget = function() {
  _origRenderHomeRPGWidget();
  try {
    const el = document.getElementById('home-rpg-widget');
    if (!el) return;
    const rawProfile = JSON.parse(localStorage.getItem('ppl_profile') || '{}');
    const rpg = rawProfile.rpg || {};
    const gold   = (rpg.gold || 0).toLocaleString();
    const tonics = rpg.emberTonics ?? 0;
    // Tonic cap from Apothecary level: 0→1, 1→2, 2→3
    const apothecary = (rpg.castle && rpg.castle.apothecary) || 0;
    const tonicMax = 1 + apothecary;

    // Build glowing dots
    const dots = Array.from({ length: tonicMax }, (_, i) => {
      const full = i < tonics;
      return `<span style="
        display:inline-block;
        width:8px;height:8px;border-radius:50%;
        margin-left:4px;
        background:${full ? 'var(--str)' : '#2A2018'};
        border:1px solid ${full ? 'var(--str)' : '#3A3020'};
        ${full ? 'box-shadow:0 0 5px 1px rgba(196,115,42,0.8),0 0 10px 2px rgba(196,115,42,0.4);' : ''}
      "></span>`;
    }).join('');

    const existing = el.querySelector('#rpg-status-line');
    if (existing) existing.remove();
    const line = document.createElement('div');
    line.id = 'rpg-status-line';
    line.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:6px 14px 8px;font-family:"DM Mono",monospace;border-top:1px solid var(--border);margin-top:6px';
    line.innerHTML = `
      <span style="font-size:11px;color:#FFA726">⚔️ ${gold}g</span>
      <span style="display:flex;align-items:center;font-size:10px;color:var(--text-muted)">🧪${dots}</span>
    `;
    el.appendChild(line);
  } catch(e) { /* silent */ }
};

// Immediately update widget with gold/tonic line
renderHomeRPGWidget();

console.log(`ppl_rpg.js ${RPG_VERSION} loaded — ${RPG_ENEMIES.length} enemies, ${RPG_QUESTS.length} quests`);
