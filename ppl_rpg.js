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

// ── INTERVAL TYPES ───────────────────────────────────────────────────────────
// fast: 9–12 ticks  |  standard: 12–14  |  slow: 15–18
function spawnInterval(type) {
  const ranges = { fast: [9, 12], standard: [12, 14], slow: [15, 18] };
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

  { id:'mud_rat',          name:'Mud Rat',          band:'1-5',   tier:'easy',   atkMult:0.16, hpMult:1.40, goldMin:5,   goldMax:10,  diffScore:50,  intervalType:'fast',     flavor:'Skitters from the shadows.  More teeth than sense.' },
  { id:'feral_hound',      name:'Feral Hound',      band:'1-5',   tier:'easy',   atkMult:0.16, hpMult:1.60, goldMin:6,   goldMax:12,  diffScore:51,  intervalType:'standard', flavor:'Ribs showing, eyes wild.  Hunger makes it fearless.' },
  { id:'bog_sprite',       name:'Bog Sprite',       band:'1-5',   tier:'easy',   atkMult:0.16, hpMult:1.45, goldMin:5,   goldMax:9,   diffScore:48,  intervalType:'fast',     flavor:'Tiny.  Vicious.  Travels in silence, arrives in pain.' },
  { id:'goblin_scrapper',  name:'Goblin Scrapper',  band:'1-5',   tier:'medium', atkMult:0.20, hpMult:2.60, goldMin:12,  goldMax:20,  diffScore:75,  intervalType:'fast',     flavor:'Barely armed.  Makes up for it with spite.' },
  { id:'hollow_shade',     name:'Hollow Shade',     band:'1-5',   tier:'medium', atkMult:0.20, hpMult:2.80, goldMin:11,  goldMax:18,  diffScore:73,  intervalType:'standard', flavor:'Darker than the dark around it.' },
  { id:'bog_toad',         name:'Bog Toad',         band:'1-5',   tier:'medium', atkMult:0.20, hpMult:3.00, goldMin:13,  goldMax:22,  diffScore:77,  intervalType:'slow',     flavor:'Slow until it isn\'t.  Its tongue is the last thing you see.' },
  { id:'rotwood_shambler', name:'Rotwood Shambler', band:'1-5',   tier:'hard',   atkMult:0.24, hpMult:2.60, goldMin:30,  goldMax:50,  diffScore:135, intervalType:'slow',     flavor:'A corpse that forgot to stop moving.' },
  { id:'crypt_crawler',    name:'Crypt Crawler',    band:'1-5',   tier:'hard',   atkMult:0.26, hpMult:2.80, goldMin:28,  goldMax:46,  diffScore:133, intervalType:'standard', flavor:'Found in places that should be sealed.' },
  { id:'stone_sentry',     name:'Stone Sentry',     band:'1-5',   tier:'hard',   atkMult:0.28, hpMult:3.00, goldMin:32,  goldMax:52,  diffScore:138, intervalType:'slow',     flavor:'Built to keep things out.  Indifferent to which things.' },

  // ── BAND 6-10 ────────────────────────────────────────────────────────────

  { id:'giant_rat',        name:'Giant Rat',        band:'6-10',  tier:'easy',   atkMult:0.16, hpMult:1.40, goldMin:8,   goldMax:15,  diffScore:50,  intervalType:'fast',     flavor:'The size of a dog.  The temperament of a nightmare.' },
  { id:'scabwing_bat',     name:'Scabwing Bat',     band:'6-10',  tier:'easy',   atkMult:0.16, hpMult:1.45, goldMin:7,   goldMax:14,  diffScore:50,  intervalType:'fast',     flavor:'Cave-blind and cave-mean.  Echolocates your regret.' },
  { id:'swamp_leech',      name:'Swamp Leech',      band:'6-10',  tier:'easy',   atkMult:0.16, hpMult:1.55, goldMin:8,   goldMax:14,  diffScore:52,  intervalType:'slow',     flavor:'The water looked safe.  It wasn\'t.' },
  { id:'goblin_bruiser',   name:'Goblin Bruiser',   band:'6-10',  tier:'medium', atkMult:0.20, hpMult:2.60, goldMin:18,  goldMax:28,  diffScore:78,  intervalType:'standard', flavor:'Found a club.  Considers itself nobility.' },
  { id:'spore_wisp',       name:'Spore Wisp',       band:'6-10',  tier:'medium', atkMult:0.22, hpMult:2.50, goldMin:17,  goldMax:26,  diffScore:77,  intervalType:'fast',     flavor:'Beautiful from a distance.  Toxic at any range.' },
  { id:'mossclaw_bear',    name:'Mossclaw Bear',    band:'6-10',  tier:'medium', atkMult:0.22, hpMult:3.00, goldMin:20,  goldMax:32,  diffScore:82,  intervalType:'slow',     flavor:'Has been eating travelers since before the road was built.' },
  { id:'crypt_walker',     name:'Crypt Walker',     band:'6-10',  tier:'hard',   atkMult:0.24, hpMult:2.60, goldMin:40,  goldMax:65,  diffScore:138, intervalType:'slow',     flavor:'It does not know it is dead.  It does not care.' },
  { id:'rusted_automaton', name:'Rusted Automaton', band:'6-10',  tier:'hard',   atkMult:0.26, hpMult:2.80, goldMin:42,  goldMax:68,  diffScore:140, intervalType:'slow',     flavor:'Centuries old.  Still effective.  Barely.' },
  { id:'barrow_knight',    name:'Barrow Knight',    band:'6-10',  tier:'hard',   atkMult:0.28, hpMult:2.60, goldMin:38,  goldMax:62,  diffScore:138, intervalType:'standard', flavor:'Buried with full honors.  Rose without them.' },

  // ── BAND 11-15 ───────────────────────────────────────────────────────────

  { id:'dire_rat',         name:'Dire Rat',         band:'11-15', tier:'easy',   atkMult:0.16, hpMult:1.40, goldMin:12,  goldMax:20,  diffScore:51,  intervalType:'fast',     flavor:'Old, scarred, and mean.  Survived everything the forest threw at it.' },
  { id:'thornback_wolf',   name:'Thornback Wolf',   band:'11-15', tier:'easy',   atkMult:0.16, hpMult:1.60, goldMin:14,  goldMax:22,  diffScore:55,  intervalType:'standard', flavor:'Spine-quilled and silent.  You hear the pack after the first bite.' },
  { id:'crumble_golem',    name:'Crumble Golem',    band:'11-15', tier:'easy',   atkMult:0.16, hpMult:1.90, goldMin:13,  goldMax:21,  diffScore:56,  intervalType:'slow',     flavor:'Half-finished.  The half that works is the dangerous half.' },
  { id:'hobgoblin_warrior',name:'Hobgoblin Warrior',band:'11-15', tier:'medium', atkMult:0.20, hpMult:2.60, goldMin:25,  goldMax:40,  diffScore:82,  intervalType:'standard', flavor:'Organized.  Armored.  Angry about it.' },
  { id:'venomfang_asp',    name:'Venomfang Asp',    band:'11-15', tier:'medium', atkMult:0.22, hpMult:2.50, goldMin:24,  goldMax:38,  diffScore:80,  intervalType:'fast',     flavor:'Coiled in the grass.  Patient as stone.' },
  { id:'frostborn_wraith', name:'Frostborn Wraith', band:'11-15', tier:'medium', atkMult:0.22, hpMult:2.80, goldMin:26,  goldMax:42,  diffScore:83,  intervalType:'standard', flavor:'Killed in winter.  Never warmed up to the idea of staying dead.' },
  { id:'iron_sentinel',    name:'Iron Sentinel',    band:'11-15', tier:'hard',   atkMult:0.24, hpMult:2.80, goldMin:60,  goldMax:90,  diffScore:147, intervalType:'slow',     flavor:'Built to guard.  Has not received orders in centuries.  Still guarding.' },
  { id:'plague_revenant',  name:'Plague Revenant',  band:'11-15', tier:'hard',   atkMult:0.26, hpMult:2.60, goldMin:58,  goldMax:88,  diffScore:147, intervalType:'standard', flavor:'Died of the sickness.  Passed it on.' },
  { id:'ashbone_archer',   name:'Ashbone Archer',   band:'11-15', tier:'hard',   atkMult:0.28, hpMult:2.60, goldMin:62,  goldMax:92,  diffScore:146, intervalType:'fast',     flavor:'Hollow ribs.  Never misses.  Hasn\'t for a hundred years.' },

  // ── BAND 16-20 ───────────────────────────────────────────────────────────

  { id:'plague_rat',       name:'Plague Rat',       band:'16-20', tier:'easy',   atkMult:0.16, hpMult:1.40, goldMin:16,  goldMax:26,  diffScore:52,  intervalType:'fast',     flavor:'The bite is the least of your concerns.' },
  { id:'razorwing_harpy',  name:'Razorwing Harpy',  band:'16-20', tier:'easy',   atkMult:0.16, hpMult:1.50, goldMin:17,  goldMax:27,  diffScore:54,  intervalType:'fast',     flavor:'Circling.  Always circling.' },
  { id:'mud_elemental',    name:'Mud Elemental',    band:'16-20', tier:'easy',   atkMult:0.16, hpMult:1.90, goldMin:15,  goldMax:24,  diffScore:56,  intervalType:'slow',     flavor:'Older than the swamp.  Angrier than the rain.' },
  { id:'troll_whelp',      name:'Troll Whelp',      band:'16-20', tier:'medium', atkMult:0.20, hpMult:2.80, goldMin:35,  goldMax:55,  diffScore:86,  intervalType:'slow',     flavor:'Half grown.  Twice as reckless for it.' },
  { id:'shadowmeld_panther',name:'Shadowmeld Panther',band:'16-20',tier:'medium',atkMult:0.22, hpMult:2.60, goldMin:33,  goldMax:52,  diffScore:85,  intervalType:'fast',     flavor:'The shadow that moves wrong.' },
  { id:'corrupted_dryad',  name:'Corrupted Dryad',  band:'16-20', tier:'medium', atkMult:0.20, hpMult:3.00, goldMin:36,  goldMax:56,  diffScore:87,  intervalType:'standard', flavor:'The forest is sick.  So is she.' },
  { id:'death_knight',     name:'Death Knight',     band:'16-20', tier:'hard',   atkMult:0.26, hpMult:2.80, goldMin:80,  goldMax:120, diffScore:154, intervalType:'standard', flavor:'Sworn to a lord long dead.  The oath remains.' },
  { id:'voidstone_golem',  name:'Voidstone Golem',  band:'16-20', tier:'hard',   atkMult:0.24, hpMult:3.10, goldMin:82,  goldMax:125, diffScore:158, intervalType:'slow',     flavor:'Carved from a stone that should not exist.' },
  { id:'wailing_banshee',  name:'Wailing Banshee',  band:'16-20', tier:'hard',   atkMult:0.28, hpMult:2.60, goldMin:78,  goldMax:118, diffScore:152, intervalType:'fast',     flavor:'The scream precedes her.  Courtesy.' },

  // ── BAND 21-25 ───────────────────────────────────────────────────────────

  { id:'marsh_wraith',     name:'Marsh Wraith',     band:'21-25', tier:'easy',   atkMult:0.16, hpMult:1.50, goldMin:20,  goldMax:32,  diffScore:55,  intervalType:'standard', flavor:'It was something once.  Now it haunts the edges of things.' },
  { id:'stoneback_boar',   name:'Stoneback Boar',   band:'21-25', tier:'easy',   atkMult:0.16, hpMult:1.70, goldMin:22,  goldMax:35,  diffScore:59,  intervalType:'slow',     flavor:'Hides like granite.  Charges like an avalanche.' },
  { id:'gloom_imp',        name:'Gloom Imp',        band:'21-25', tier:'easy',   atkMult:0.16, hpMult:1.40, goldMin:19,  goldMax:30,  diffScore:53,  intervalType:'fast',     flavor:'Small, irritating, and somehow everywhere at once.' },
  { id:'forest_troll',     name:'Forest Troll',     band:'21-25', tier:'medium', atkMult:0.20, hpMult:3.00, goldMin:45,  goldMax:70,  diffScore:90,  intervalType:'slow',     flavor:'Older than the trees.  Angrier than the storm.' },
  { id:'emberclaw_drake',  name:'Emberclaw Drake',  band:'21-25', tier:'medium', atkMult:0.22, hpMult:2.80, goldMin:44,  goldMax:68,  diffScore:90,  intervalType:'standard', flavor:'Too young to breathe fire properly.  Still trying.' },
  { id:'blightwood_spider',name:'Blightwood Spider',band:'21-25', tier:'medium', atkMult:0.22, hpMult:2.60, goldMin:46,  goldMax:72,  diffScore:91,  intervalType:'fast',     flavor:'The web covers two trees.  She covers three.' },
  { id:'bone_colossus',    name:'Bone Colossus',    band:'21-25', tier:'hard',   atkMult:0.24, hpMult:3.10, goldMin:100, goldMax:150, diffScore:160, intervalType:'slow',     flavor:'Assembled from the remains of a hundred fallen warriors.' },
  { id:'chaos_elemental',  name:'Chaos Elemental',  band:'21-25', tier:'hard',   atkMult:0.26, hpMult:2.80, goldMin:98,  goldMax:148, diffScore:159, intervalType:'standard', flavor:'Fire, stone, and storm arguing with each other.  Directed at you.' },
  { id:'corrupted_paladin',name:'Corrupted Paladin',band:'21-25', tier:'hard',   atkMult:0.28, hpMult:2.60, goldMin:102, goldMax:155, diffScore:160, intervalType:'standard', flavor:'The armor is still polished.  The soul is not.' },

  // ── BAND 26-30 ───────────────────────────────────────────────────────────

  { id:'phantom_hound',    name:'Phantom Hound',    band:'26-30', tier:'easy',   atkMult:0.16, hpMult:1.43, goldMin:26,  goldMax:40,  diffScore:57,  intervalType:'standard', flavor:'Leaves no tracks.  Makes no sound.  Already behind you.' },
  { id:'cursed_scarecrow', name:'Cursed Scarecrow', band:'26-30', tier:'easy',   atkMult:0.16, hpMult:2.00, goldMin:24,  goldMax:38,  diffScore:58,  intervalType:'slow',     flavor:'The field it guards has been dead for years.' },
  { id:'barbed_viper',     name:'Barbed Viper',     band:'26-30', tier:'easy',   atkMult:0.16, hpMult:1.40, goldMin:25,  goldMax:39,  diffScore:56,  intervalType:'fast',     flavor:'A second set of fangs.  For emergencies.' },
  { id:'dark_ranger',      name:'Dark Ranger',      band:'26-30', tier:'medium', atkMult:0.20, hpMult:4.00, goldMin:55,  goldMax:85,  diffScore:92,  intervalType:'standard', flavor:'Served the kingdom.  The kingdom is gone.  The arrows remain.' },
  { id:'scalehide_drake',  name:'Scalehide Drake',  band:'26-30', tier:'medium', atkMult:0.24, hpMult:2.57, goldMin:56,  goldMax:88,  diffScore:96,  intervalType:'slow',     flavor:'Graduated from singed to scorched.' },
  { id:'thornwraith',      name:'Thornwraith',      band:'26-30', tier:'medium', atkMult:0.24, hpMult:3.14, goldMin:54,  goldMax:84,  diffScore:94,  intervalType:'standard', flavor:'Roots, thorn, and old hatred.  The forest\'s revenge.' },
  { id:'shadow_lich',      name:'Shadow Lich',      band:'26-30', tier:'hard',   atkMult:0.24, hpMult:2.57, goldMin:130, goldMax:180, diffScore:170, intervalType:'fast',     flavor:'Traded mortality for this.  The math was wrong.' },
  { id:'ironclad_revenant',name:'Ironclad Revenant',band:'26-30', tier:'hard',   atkMult:0.28, hpMult:3.14, goldMin:128, goldMax:178, diffScore:172, intervalType:'slow',     flavor:'Died in full plate.  Returned in full plate.' },
  { id:'ashstorm_elemental',name:'Ashstorm Elemental',band:'26-30',tier:'hard',  atkMult:0.30, hpMult:2.57, goldMin:132, goldMax:182, diffScore:169, intervalType:'standard', flavor:'Born from a battlefield fire that never went out.' },

  // ── BAND 31-35 ───────────────────────────────────────────────────────────

  { id:'wight',            name:'Wight',            band:'31-35', tier:'easy',   atkMult:0.16, hpMult:1.50, goldMin:32,  goldMax:50,  diffScore:59,  intervalType:'standard', flavor:'Cold intelligence behind empty eyes.' },
  { id:'stone_gargoyle',   name:'Stone Gargoyle',   band:'31-35', tier:'easy',   atkMult:0.16, hpMult:1.90, goldMin:34,  goldMax:53,  diffScore:62,  intervalType:'slow',     flavor:'Perched so long it forgot it could move.  Now it remembers.' },
  { id:'razorfin_serpent', name:'Razorfin Serpent', band:'31-35', tier:'easy',   atkMult:0.16, hpMult:1.45, goldMin:30,  goldMax:48,  diffScore:59,  intervalType:'fast',     flavor:'River-dwelling.  Highly territorial.  You\'re in the river.' },
  { id:'ancient_troll',    name:'Ancient Troll',    band:'31-35', tier:'medium', atkMult:0.20, hpMult:3.00, goldMin:70,  goldMax:105, diffScore:100, intervalType:'slow',     flavor:'The forest grew around it.  The forest is afraid of it.' },
  { id:'infernus_drake',   name:'Infernus Drake',   band:'31-35', tier:'medium', atkMult:0.22, hpMult:2.80, goldMin:68,  goldMax:102, diffScore:99,  intervalType:'standard', flavor:'Finally figured out the fire thing.  Very enthusiastic about it.' },
  { id:'plague_knight',    name:'Plague Knight',    band:'31-35', tier:'medium', atkMult:0.22, hpMult:2.60, goldMin:72,  goldMax:108, diffScore:101, intervalType:'standard', flavor:'The sickness spread.  He made it a weapon.' },
  { id:'warlords_champion',name:"Warlord's Champion",band:'31-35',tier:'hard',   atkMult:0.26, hpMult:2.80, goldMin:160, goldMax:220, diffScore:178, intervalType:'standard', flavor:'Won every duel.  Expects to win this one.' },
  { id:'gravelord',        name:'Gravelord',        band:'31-35', tier:'hard',   atkMult:0.24, hpMult:3.10, goldMin:158, goldMax:218, diffScore:180, intervalType:'slow',     flavor:'Commands the dead.  Counts among them.' },
  { id:'arcane_stalker',   name:'Arcane Stalker',   band:'31-35', tier:'hard',   atkMult:0.28, hpMult:2.60, goldMin:162, goldMax:222, diffScore:178, intervalType:'fast',     flavor:'Magic made patient.  Hunting made precise.' },

  // ── BAND 36-40 ───────────────────────────────────────────────────────────

  { id:'dusk_specter',     name:'Dusk Specter',     band:'36-40', tier:'easy',   atkMult:0.16, hpMult:1.50, goldMin:40,  goldMax:62,  diffScore:61,  intervalType:'fast',     flavor:'Exists between moments.  Strikes in the gaps.' },
  { id:'ironhide_beetle',  name:'Ironhide Beetle',  band:'36-40', tier:'easy',   atkMult:0.16, hpMult:2.00, goldMin:38,  goldMax:60,  diffScore:64,  intervalType:'slow',     flavor:'Its carapace has turned away swords.  Many swords.' },
  { id:'ashwing_gargoyle', name:'Ashwing Gargoyle', band:'36-40', tier:'easy',   atkMult:0.16, hpMult:1.60, goldMin:39,  goldMax:61,  diffScore:63,  intervalType:'standard', flavor:'The stone form was a disguise.  Barely.' },
  { id:'void_stalker',     name:'Void Stalker',     band:'36-40', tier:'medium', atkMult:0.22, hpMult:2.80, goldMin:85,  goldMax:130, diffScore:104, intervalType:'fast',     flavor:'Hunts in the spaces between light and shadow.' },
  { id:'magma_drake',      name:'Magma Drake',      band:'36-40', tier:'medium', atkMult:0.22, hpMult:3.00, goldMin:86,  goldMax:132, diffScore:105, intervalType:'slow',     flavor:'Swam up from below the castle.  Still dripping.' },
  { id:'deathshroud_ranger',name:'Deathshroud Ranger',band:'36-40',tier:'medium',atkMult:0.20, hpMult:2.60, goldMin:84,  goldMax:128, diffScore:103, intervalType:'fast',     flavor:'The arrows are cursed.  The aim is not.' },
  { id:'fallen_paladin',   name:'Fallen Paladin',   band:'36-40', tier:'hard',   atkMult:0.26, hpMult:2.80, goldMin:200, goldMax:270, diffScore:188, intervalType:'standard', flavor:'The faith is gone.  The wrath remains.' },
  { id:'voidbound_colossus',name:'Voidbound Colossus',band:'36-40',tier:'hard',  atkMult:0.24, hpMult:3.10, goldMin:195, goldMax:265, diffScore:191, intervalType:'slow',     flavor:'Built from dark matter and worse intentions.' },
  { id:'lich_sovereign',   name:'Lich Sovereign',   band:'36-40', tier:'hard',   atkMult:0.28, hpMult:2.60, goldMin:202, goldMax:275, diffScore:189, intervalType:'fast',     flavor:'Has had centuries to perfect the art of not dying.' },

  // ── BAND 41-45 ───────────────────────────────────────────────────────────

  { id:'abyssal_hound',    name:'Abyssal Hound',    band:'41-45', tier:'easy',   atkMult:0.16, hpMult:1.60, goldMin:50,  goldMax:75,  diffScore:66,  intervalType:'fast',     flavor:'Bred in the dark.  Never seen the sun.  Does not miss it.' },
  { id:'dread_wisp',       name:'Dread Wisp',       band:'41-45', tier:'easy',   atkMult:0.16, hpMult:1.50, goldMin:48,  goldMax:72,  diffScore:62,  intervalType:'standard', flavor:'Ancient light turned malevolent.  It remembers being warm.' },
  { id:'void_imp',         name:'Void Imp',         band:'41-45', tier:'easy',   atkMult:0.16, hpMult:1.40, goldMin:46,  goldMax:70,  diffScore:62,  intervalType:'fast',     flavor:'Consumed by something worse.' },
  { id:'nightmare_ranger', name:'Nightmare Ranger', band:'41-45', tier:'medium', atkMult:0.22, hpMult:2.80, goldMin:105, goldMax:160, diffScore:110, intervalType:'fast',     flavor:'Arrows that find you regardless of cover.' },
  { id:'elder_drake',      name:'Elder Drake',      band:'41-45', tier:'medium', atkMult:0.22, hpMult:3.00, goldMin:107, goldMax:162, diffScore:112, intervalType:'slow',     flavor:'Has mastered the fire.  Is working on the patience.' },
  { id:'primordial_troll', name:'Primordial Troll', band:'41-45', tier:'medium', atkMult:0.20, hpMult:3.14, goldMin:108, goldMax:165, diffScore:112, intervalType:'slow',     flavor:'The Ancient Troll\'s older, quieter sibling.  Much quieter.' },
  { id:'arcane_golem',     name:'Arcane Golem',     band:'41-45', tier:'hard',   atkMult:0.24, hpMult:3.10, goldMin:250, goldMax:330, diffScore:201, intervalType:'slow',     flavor:'Powered by a spell its maker no longer remembers.' },
  { id:'dread_general',    name:'Dread General',    band:'41-45', tier:'hard',   atkMult:0.26, hpMult:2.80, goldMin:248, goldMax:328, diffScore:201, intervalType:'standard', flavor:'Commands armies that no longer exist.  Keeps the schedule anyway.' },
  { id:'obliteration_wraith',name:'Obliteration Wraith',band:'41-45',tier:'hard',atkMult:0.28, hpMult:2.60, goldMin:252, goldMax:335, diffScore:202, intervalType:'fast',     flavor:'Not haunting.  Consuming.' },

  // ── BAND 46-50 ───────────────────────────────────────────────────────────

  { id:'soul_eater',       name:'Soul Eater',       band:'46-50', tier:'easy',   atkMult:0.16, hpMult:1.60, goldMin:60,  goldMax:90,  diffScore:68,  intervalType:'fast',     flavor:'Takes more than your HP.' },
  { id:'void_wraith',      name:'Void Wraith',      band:'46-50', tier:'easy',   atkMult:0.16, hpMult:1.70, goldMin:62,  goldMax:93,  diffScore:69,  intervalType:'standard', flavor:'The last thing the old kingdom\'s mages created.  The last thing they did.' },
  { id:'abyss_crawler',    name:'Abyss Crawler',    band:'46-50', tier:'easy',   atkMult:0.16, hpMult:1.90, goldMin:58,  goldMax:88,  diffScore:69,  intervalType:'slow',     flavor:'Climbed up from somewhere deeper than the castle goes.' },
  { id:'elder_void_stalker',name:'Elder Void Stalker',band:'46-50',tier:'medium',atkMult:0.22, hpMult:3.00, goldMin:130, goldMax:200, diffScore:120, intervalType:'fast',     flavor:'Has hunted longer than most kingdoms have existed.' },
  { id:'legendary_drake',  name:'Legendary Drake',  band:'46-50', tier:'medium', atkMult:0.22, hpMult:2.80, goldMin:132, goldMax:202, diffScore:120, intervalType:'slow',     flavor:'Named in three languages.  Feared in all of them.' },
  { id:'wraith_sovereign', name:'Wraith Sovereign', band:'46-50', tier:'medium', atkMult:0.24, hpMult:3.14, goldMin:134, goldMax:205, diffScore:121, intervalType:'standard', flavor:'Rules the dead in the way the living never managed the living.' },
  { id:'dread_sovereign',  name:'Dread Sovereign',  band:'46-50', tier:'hard',   atkMult:0.28, hpMult:3.10, goldMin:320, goldMax:420, diffScore:222, intervalType:'standard', flavor:'Ruled in darkness for a thousand years.  Has not grown tired of it.' },
  { id:'eternal_golem',    name:'Eternal Golem',    band:'46-50', tier:'hard',   atkMult:0.26, hpMult:3.14, goldMin:315, goldMax:415, diffScore:223, intervalType:'slow',     flavor:'The original.  Everything else was an attempt to copy it.' },
  { id:'void_archon',      name:'Void Archon',      band:'46-50', tier:'hard',   atkMult:0.30, hpMult:2.80, goldMin:325, goldMax:425, diffScore:223, intervalType:'fast',     flavor:'Older than the world it is trying to unmake.' },
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

// Unique item keyword pools (adjective-first format)
const RPG_UNIQUE_KEYWORDS = {
  STR: ['Crushing','Rending','Smashing','Wrathful','Cleaving','Ruinous','Breaching','Sundering'],
  AGI: ['Swift','Galeforce','Darting','Zephyr','Flash','Rushing','Blurring','Drifting'],
  DEX: ['True','Sharp','Piercing','Keen','Unerring','Exacting','Steady','Flint'],
  END: ['Fortified','Granite','Steadfast','Bastion','Rampart','Forged','Stalwart','Ironclad'],
};

// Unique item slot passives — scale by band group
// bandGroup: 0=bands 1-10, 1=bands 11-25, 2=bands 26-40, 3=bands 41-50
function rpgUniquePassive(slot, bandGroup) {
  const pcts = [8, 10, 11, 12];
  const p = pcts[bandGroup];
  const dmgs = [8, 10, 11, 12];
  const d = dmgs[bandGroup];
  const ticks = [2, 3, 3, 4];
  const t = ticks[bandGroup];
  const hps = [8, 15, 38, 55];
  const h = hps[bandGroup];
  switch (slot) {
    case 'weapon':     return { type:'lifesteal', value:p, desc:`Lifesteal — heal ${p}% of damage dealt per attack` };
    case 'shield':     return { type:'reflect',   value:p, dmgReduce:d, desc:`Reflect — ${p}% chance to reduce incoming damage by ${d}` };
    case 'helmet':     return { type:'sharp_eye', value:p, desc:`Sharp Eye — +${p}% crit chance` };
    case 'body_armor': return { type:'thorns',    value:p, desc:`Thorns — enemy takes ${p}% of damage dealt to you` };
    case 'boots':      return { type:'haste',     value:t, desc:`Haste — -${t} tick attack interval` };
    case 'jewelry':    return { type:'resilience',value:h, desc:`Resilience — +${h} HP regen after each fight` };
  }
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
    };
    saveProfile(p);
  }
  return p;
}

function rpgSaveProfile(p) {
  saveProfile(p);   // delegates to main app saveProfile()
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
  const baseHP   = 200 + (realEND * 6) + (level * 10) + gearHP;
  const maxHP    = Math.round(baseHP * trainingBonus);
  const atk      = Math.round(effSTR * 1.4 * barracksBonus);
  const mitigation = effEND / (effEND + 300);
  const critChance = effDEX / (effDEX + 200);
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
  const tonics  = profile.rpg.emberTonics || 1;
  const maxHP   = stats.maxHP;
  const curHP   = profile.rpg.currentHP ?? maxHP;

  // Initialise HP on first RPG load
  if (profile.rpg.currentHP === null) {
    profile.rpg.currentHP = maxHP;
    rpgSaveProfile(profile);
  }

  const hpPct = Math.round((curHP / maxHP) * 100);
  const hpColor = hpPct > 60 ? '#4CAF50' : hpPct > 30 ? '#FFA726' : '#EF5350';

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

  <!-- Destination Grid -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:0 16px;">
    ${[
      ['⚔️','The Wilds','Field · Forest · Castle','showRPGWilds()'],
      ['🏰','The Castle','Upgrades & buildings','showRPGCastle()'],
      ['📋','Quest Board','Active quests','showRPGQuestBoard()'],
      ['🛒','Shop','Buy gear & tonics','showRPGShop()'],
    ].map(([icon,title,sub,fn])=>`
      <div onclick="${fn}" style="
        background:var(--card);border:1px solid var(--border);border-radius:10px;
        padding:16px 14px;cursor:pointer;display:flex;flex-direction:column;gap:6px;min-height:90px;
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
      <div style="font-size:10px;color:var(--text-muted);margin-bottom:2px">EMBER TONICS</div>
      <div style="font-size:15px;font-weight:500;color:var(--str)">${tonics}</div>
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

function showRPGCharacterSheet() {
  alert('Character Sheet — coming in Phase 2');
}
function showRPGWilds() {
  alert('The Wilds — coming in Phase 3');
}
function showRPGCastle() {
  alert('The Castle — coming in Phase 4');
}
function showRPGQuestBoard() {
  alert('Quest Board — coming in Phase 3');
}
function showRPGShop() {
  alert('Shop — coming in Phase 4');
}

// ── Close RPG, return to training ────────────────────────────────────────────

function closeRPG() {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-home').classList.add('active');
  showHome();
}

// ── Entry point called by openRPG() in ppl_workout.html ──────────────────────

window.rpgLoaded = true;
showRPGHub();

console.log(`ppl_rpg.js ${RPG_VERSION} loaded — ${RPG_ENEMIES.length} enemies, ${RPG_QUESTS.length} quests`);
