/* Lantern Quest - game data: 10 levels, 10 bosses, 30 monster types, NPC gifts, story text. */
(function () {
  var LQ = window.LQ = {};
  LQ.T = 30; LQ.ROWS = 12; LQ.VW = 640; LQ.VH = 360;

  /* ---- biomes (look + which monsters live there) ---- */
  LQ.BIOMES = {
    forest: { sky: ["#8fd3ff", "#f3fbff"], far: "#86b99a", mid: "#4f9a62", top: "#5fc15f", dirt: ["#7a5230", "#4c2f19"], plank: "#b98348", fx: "leaf", mon: [0, 1, 2, 3], wild: ["deer", "rabbit", "fox", "bird"] },
    river: { sky: ["#9ad8ff", "#f6fcff"], far: "#7cb6a4", mid: "#3f8f66", top: "#6ac56a", dirt: ["#6f4a2b", "#412814"], plank: "#b98348", fx: "leaf", mon: [3, 4, 5, 1, 2], wild: ["deer", "fish", "bird", "rabbit"], river: true },
    caves: { sky: ["#150f30", "#32285f"], far: "#3d3380", mid: "#26205a", top: "#6fd8ff", dirt: ["#413b86", "#211d4d"], plank: "#8fc8ee", fx: "spark", mon: [6, 7, 8, 9], wild: ["bat", "rabbit"], dark: true },
    ruins: { sky: ["#a7b9d6", "#f0e6d0"], far: "#9aa0b4", mid: "#6e7388", top: "#8fae6a", dirt: ["#7b7568", "#4d493f"], plank: "#b7a98a", fx: "dust", mon: [10, 11, 12, 13, 14], wild: ["bird", "fox", "deer"] },
    temple: { sky: ["#f2b46a", "#ffe9b8"], far: "#c9966a", mid: "#a2693f", top: "#d6b068", dirt: ["#a8723f", "#6b4422"], plank: "#e0b46c", fx: "ember", mon: [15, 16, 17, 18, 13], wild: ["bird", "lizard"] },
    mines: { sky: ["#2a1d14", "#5c3f27"], far: "#5e4330", mid: "#3d2a1c", top: "#a07a52", dirt: ["#6d4d34", "#3a2819"], plank: "#c99a5c", fx: "dust", mon: [19, 20, 21, 22, 6], wild: ["bat", "rabbit"], dark: true },
    desert: { sky: ["#ffcf7a", "#fff1c9"], far: "#e7b878", mid: "#cf9a55", top: "#efcf84", dirt: ["#c79552", "#8d6330"], plank: "#d9b06a", fx: "dust", mon: [23, 24, 25, 26, 13], wild: ["camel", "lizard", "bird"] },
    ice: { sky: ["#9fc7ee", "#eefaff"], far: "#b4cfe8", mid: "#8cb0d6", top: "#f4fbff", dirt: ["#a6c4e0", "#6f94bb"], plank: "#d8f0ff", fx: "snow", mon: [27, 28, 29, 26], wild: ["goat", "bird", "rabbit"] },
    citadel: { sky: ["#0c0820", "#3b1747"], far: "#2f2050", mid: "#1b1233", top: "#8a6bd0", dirt: ["#352554", "#190f2c"], plank: "#9d86e0", fx: "ember", mon: [10, 12, 14, 17, 28, 29, 16], wild: ["bat"], dark: true }
  };

  /* ---- 10 levels ---- */
  LQ.LEVELS = [
    { name: "Whispering Forest", bio: "forest", boss: 0, story: ["Monsters have swallowed the world of Lumora.", "Villagers are caged in the Whispering Forest.", "Find Old Bram the smith. He has a sword for you."] },
    { name: "Riverbend Woods", bio: "river", boss: 1, story: ["Past the river, a giant bog beast guards the bridge.", "Hunter Lyra waits ahead with a bow."] },
    { name: "Crystal Caves", bio: "caves", boss: 2, story: ["Glowing crystals light the dark caves.", "A spider queen has webbed the way. A hermit hides here."] },
    { name: "Sunken Ruins", bio: "ruins", boss: 3, story: ["Ancient ruins crawl with the undead.", "A stone colossus wakes when you come close."] },
    { name: "Temple of Horns", bio: "temple", boss: 4, story: ["The temple bulls charge at anything that moves.", "Dodge them and let them hit the pillars!"] },
    { name: "Forgotten Mines", bio: "mines", boss: 5, story: ["Goblins dug too deep and woke something below.", "Watch the ground. It trembles before it bursts."] },
    { name: "Scorched Dunes", bio: "desert", boss: 6, story: ["Heat shimmers over the endless dunes.", "A giant scorpion king rules the sand."] },
    { name: "Tomb of Sands", bio: "desert", boss: 7, story: ["A buried tomb. A cursed pharaoh rises with his mummy guard.", "The Sage Mira knows how to break his curse."] },
    { name: "Frostpeak Mountains", bio: "ice", boss: 8, story: ["Blizzards howl over the frozen peaks.", "A frost dragon circles above the pass."] },
    { name: "Citadel of Gloom", bio: "citadel", boss: 9, story: ["The last fortress. Morvane the Gloom King waits.", "End his reign and free Lumora!"] }
  ];

  /* ---- 30 monster types. body: biped|quad|blob|flyer|snake|spider|skel|wisp|plant|golem
        bh (behaviour): walk|charge|hop|fly|shoot|slither|ghost|bomber|tank ---- */
  LQ.MON = [
    /* 0-3 forest */
    { n: "Thornling", body: "plant", w: 26, h: 32, hp: 30, sp: 55, dm: 9, bh: "walk", c: ["#4e8f3a", "#a8e060", "#ff5a3a"], ft: ["thorn"] },
    { n: "Tusk Boar", body: "quad", w: 40, h: 28, hp: 44, sp: 62, dm: 12, bh: "charge", c: ["#6b4a36", "#e8dcc0", "#ff4630"], ft: ["tusk"] },
    { n: "Shadow Wolf", body: "quad", w: 38, h: 26, hp: 36, sp: 95, dm: 11, bh: "walk", c: ["#2a2c3a", "#8a8fb8", "#ffd040"], ft: ["fang"] },
    { n: "Venom Wasp", body: "flyer", w: 28, h: 22, hp: 22, sp: 90, dm: 8, bh: "fly", c: ["#e2b830", "#2a2208", "#ff3a3a"], ft: ["stinger"] },
    /* 4-5 river */
    { n: "Bog Slime", body: "blob", w: 30, h: 24, hp: 34, sp: 40, dm: 9, bh: "hop", c: ["#6fb34a", "#c4f07a", "#2a3a10"], ft: [] },
    { n: "Swamp Lurker", body: "biped", w: 28, h: 40, hp: 46, sp: 50, dm: 11, bh: "shoot", c: ["#3f7a68", "#a8d8b0", "#ffe040"], ft: ["fin", "fang"], pr: "spit" },
    /* 6-9 caves */
    { n: "Gloom Bat", body: "flyer", w: 30, h: 20, hp: 20, sp: 100, dm: 8, bh: "fly", c: ["#4a3a78", "#a890e8", "#ff6070"], ft: ["bat"] },
    { n: "Cave Spider", body: "spider", w: 34, h: 24, hp: 32, sp: 85, dm: 10, bh: "walk", c: ["#2c2a3a", "#7a60c0", "#ff3050"], ft: [] },
    { n: "Crystal Beetle", body: "quad", w: 42, h: 28, hp: 70, sp: 38, dm: 12, bh: "tank", c: ["#3a5a9a", "#7fe0ff", "#fff060"], ft: ["crystal"] },
    { n: "Glowcap Spore", body: "plant", w: 28, h: 34, hp: 30, sp: 0, dm: 9, bh: "shoot", c: ["#a04a8a", "#f2a0e0", "#fff0a0"], ft: ["cap"], pr: "spore" },
    /* 10-14 ruins */
    { n: "Skeleton Soldier", body: "skel", w: 26, h: 42, hp: 40, sp: 56, dm: 12, bh: "walk", c: ["#d8d2c0", "#7a7462", "#ff4040"], ft: ["shield"] },
    { n: "Skeleton Archer", body: "skel", w: 26, h: 42, hp: 30, sp: 40, dm: 10, bh: "shoot", c: ["#d8d2c0", "#7a7462", "#40e0ff"], ft: ["bow"], pr: "arrow" },
    { n: "Stone Gargoyle", body: "flyer", w: 36, h: 32, hp: 54, sp: 80, dm: 13, bh: "fly", c: ["#7c8090", "#c4c8d8", "#ff7040"], ft: ["horn", "wing"] },
    { n: "Restless Wraith", body: "wisp", w: 30, h: 44, hp: 34, sp: 46, dm: 11, bh: "ghost", c: ["#6a7ad8", "#cdd8ff", "#ffffff"], ft: [] },
    { n: "Cursed Knight", body: "biped", w: 30, h: 46, hp: 86, sp: 40, dm: 16, bh: "tank", c: ["#454a60", "#a0a8c8", "#ff3030"], ft: ["helm", "horn"] },
    /* 15-18 temple */
    { n: "Horned Imp", body: "biped", w: 24, h: 34, hp: 32, sp: 70, dm: 10, bh: "shoot", c: ["#c0402a", "#ff9060", "#ffe040"], ft: ["horn", "tail"], pr: "fire" },
    { n: "Guardian Statue", body: "golem", w: 40, h: 52, hp: 100, sp: 30, dm: 17, bh: "tank", c: ["#b49462", "#e8d09a", "#40ffd0"], ft: [] },
    { n: "Fire Cultist", body: "biped", w: 26, h: 42, hp: 40, sp: 48, dm: 11, bh: "shoot", c: ["#7a1f2a", "#ff8a3a", "#ffd060"], ft: ["hood"], pr: "fire" },
    { n: "Bone Hound", body: "quad", w: 40, h: 28, hp: 42, sp: 70, dm: 12, bh: "charge", c: ["#dcd4bc", "#8a8470", "#ff4a30"], ft: ["ribs", "fang"] },
    /* 19-22 mines */
    { n: "Goblin Miner", body: "biped", w: 24, h: 34, hp: 34, sp: 78, dm: 10, bh: "walk", c: ["#6f9a3a", "#c9b060", "#ffec3a"], ft: ["pick", "ear"] },
    { n: "Rock Crawler", body: "quad", w: 44, h: 28, hp: 84, sp: 32, dm: 14, bh: "tank", c: ["#6b6a6e", "#a8a6ae", "#ff8030"], ft: ["rock"] },
    { n: "Lava Slug", body: "snake", w: 44, h: 18, hp: 40, sp: 38, dm: 11, bh: "slither", c: ["#d04a1a", "#ffb040", "#ffffff"], ft: ["glow"] },
    { n: "Bomb Bat", body: "flyer", w: 30, h: 24, hp: 24, sp: 70, dm: 14, bh: "bomber", c: ["#5a3a2a", "#e8b060", "#ff4030"], ft: ["bat", "bomb"] },
    /* 23-26 desert */
    { n: "Sand Scorpion", body: "spider", w: 42, h: 28, hp: 52, sp: 60, dm: 13, bh: "walk", c: ["#b8742a", "#f0b860", "#ff3030"], ft: ["tail"] },
    { n: "Dust Serpent", body: "snake", w: 52, h: 20, hp: 36, sp: 100, dm: 11, bh: "slither", c: ["#c9a248", "#f6e090", "#d02a2a"], ft: ["fang"] },
    { n: "Tomb Mummy", body: "biped", w: 28, h: 44, hp: 74, sp: 36, dm: 14, bh: "tank", c: ["#d8cca8", "#9a8c68", "#40ff90"], ft: ["wrap"] },
    { n: "Vulture Fiend", body: "flyer", w: 38, h: 30, hp: 36, sp: 85, dm: 12, bh: "fly", c: ["#5a3e3a", "#c88a78", "#ffe040"], ft: ["beak", "wing"] },
    /* 27-29 ice */
    { n: "Frost Wolf", body: "quad", w: 40, h: 28, hp: 46, sp: 90, dm: 12, bh: "charge", c: ["#8ab4e0", "#f0faff", "#40e0ff"], ft: ["fang", "frost"] },
    { n: "Ice Wraith", body: "wisp", w: 30, h: 44, hp: 40, sp: 40, dm: 11, bh: "ghost", c: ["#6ad0f0", "#e0faff", "#ffffff"], ft: ["frost"], pr: "ice" },
    { n: "Yeti Brute", body: "biped", w: 40, h: 54, hp: 96, sp: 42, dm: 17, bh: "charge", c: ["#e6f0f8", "#a0b8d0", "#ff5030"], ft: ["fur", "fang"] }
  ];

  /* ---- 10 bosses. moves: charge slam leap fan rain summon roots burrow teleport ---- */
  LQ.BOSS = [
    { n: "Gnarlroot, the Rotting Treant", body: "treant", w: 90, h: 130, hp: 320, sp: 38, dm: 16, moves: ["roots", "summon", "slam"], c: ["#4a3320", "#3f7a2a", "#ff5030"], armor: 0.6,
      hint: "Gnarlroot's bark is tough. Wait until his roots erupt or he slams, then he is stunned: hit him with sword or beam (the Spirit Beam does extra). Step away from the glowing circles on the ground." },
    { n: "Bog Behemoth", body: "toad", w: 110, h: 90, hp: 420, sp: 40, dm: 17, moves: ["leap", "fan", "summon"], c: ["#4f7f3a", "#a8d070", "#ffe040"], armor: 0.7,
      hint: "The toad leaps at where you stand, then lands tired. Run under his jump and strike while he rests. Shoot arrows while he spits slime from afar." },
    { n: "Veyra, the Cave Broodmother", body: "spider", w: 120, h: 80, hp: 520, sp: 50, dm: 17, moves: ["fan", "leap", "summon", "rain"], c: ["#2a2438", "#8a60d8", "#ff3050"], armor: 0.7,
      hint: "Kill the spiderlings first so you are not swarmed. Veyra drops webs from the roof: watch the shadows. She is vulnerable right after she jumps." },
    { n: "Ruin Colossus", body: "golem", w: 110, h: 150, hp: 640, sp: 30, dm: 20, moves: ["slam", "rain", "charge"], c: ["#7a7a86", "#b8bcc8", "#40ffd0"], armor: 0.4,
      hint: "Stone armor blocks most damage! Only the eye glow after a slam or charge opens a weak point: hit him then (x2.5). Jump the ground shockwaves." },
    { n: "Horngore the Temple Bull", body: "minotaur", w: 100, h: 130, hp: 760, sp: 48, dm: 20, moves: ["charge", "charge", "slam", "summon"], c: ["#7a3a24", "#e0c8a0", "#ff3a20"], armor: 0.5,
      hint: "Stand away from the wall and let him charge. If he crashes into the wall he is stunned for 3 seconds: swing everything you have!" },
    { n: "Gravelmaw the Deep Worm", body: "worm", w: 90, h: 150, hp: 880, sp: 40, dm: 21, moves: ["burrow", "rain", "fan"], c: ["#6a5a4a", "#d8c8a8", "#ff9030"], armor: 0.6,
      hint: "When the ground shakes he bursts out under you: keep moving! Hit his head while he is out. Rocks fall after he roars: look for the shadows." },
    { n: "Kharzul, Scorpion King", body: "scorpion", w: 130, h: 90, hp: 1000, sp: 52, dm: 21, moves: ["fan", "charge", "leap", "summon"], c: ["#a8642a", "#f0b860", "#ff3030"], armor: 0.6,
      hint: "His tail fires stingers in a fan: jump the low ones, duck under none. When he charges and misses, he is stunned. Use arrows to chip him from range." },
    { n: "Pharaoh Khet-Ra", body: "pharaoh", w: 80, h: 130, hp: 1150, sp: 40, dm: 22, moves: ["summon", "fan", "rain", "teleport"], c: ["#d8c070", "#2a6a8a", "#40ffd0"], armor: 0.55,
      hint: "Khet-Ra teleports and summons mummies. Break his curse by hitting him right after he teleports back. Beam and Holy Sword shine here." },
    { n: "Skarn, the Frost Wyrm", body: "dragon", w: 150, h: 110, hp: 1350, sp: 55, dm: 23, moves: ["fan", "leap", "rain", "charge"], c: ["#5a88c0", "#d8f0ff", "#40e8ff"], armor: 0.6,
      hint: "His icy breath comes in a fan: jump between the shards. Icicles fall after a roar. He is open after a dive or charge: attack then. Fire beams hit him hardest." },
    { n: "Morvane, the Gloom King", body: "king", w: 100, h: 150, hp: 1800, sp: 50, dm: 24, moves: ["teleport", "fan", "rain", "summon", "slam", "charge"], c: ["#2a1a3e", "#8a4ad8", "#ff3a60"], armor: 0.5,
      hint: "Morvane uses every trick. Stay together! Attack when he is stunned after a slam or charge. Below half health he gets faster: keep healing at campfires and with villagers." }
  ];

  /* ---- friendly NPCs that hand out gear (the whole party receives it) ---- */
  LQ.GIFTS = [
    { who: "Old Bram the Smith", slot: "sw", tier: 1, name: "Iron Sword", say: "Take this sword, hero. Press the sword button to slash." },
    { who: "Hunter Lyra", slot: "bw", tier: 1, name: "Hunter's Bow", say: "A bow! Press the bow button to shoot from afar." },
    { who: "The Hermit", slot: "bm", tier: 1, name: "Spirit Beam", say: "Spirit energy now flows in you. Press the beam button when the meter is full." },
    { who: "Grunda the Dwarf", slot: "sw", tier: 2, name: "Steel Blade", say: "Forged in mountain fire. It cuts deeper." },
    { who: "Sylwen the Elf", slot: "bw", tier: 2, name: "Elven Bow", say: "Light as wind, it shoots faster." },
    { who: "Brother Anselm", slot: "bm", tier: 2, name: "Flame Beam", say: "The Flame Beam burns through armor." },
    { who: "Sir Aldric", slot: "sw", tier: 3, name: "Holy Sword", say: "A holy blade that glows against the undead." },
    { who: "Sage Mira", slot: "bw", tier: 3, name: "Storm Bow", say: "The Storm Bow fires three arrows at once." },
    { who: "Frost Shaman", slot: "bm", tier: 3, name: "Frost Beam", say: "Freeze the Wyrm with this beam." },
    { who: "Spirit of Lumora", slot: "hp", tier: 1, name: "Lumora's Blessing", say: "My light is yours. Go and end the Gloom King." }
  ];

  LQ.INTRO = ["LUMORA IS FALLING", "Monsters have taken control of the world.", "The villagers are caged, the land is dark.", "One hero stands up to rescue them all."];
  LQ.TIPS = [
    "Move with the stick, jump with JUMP. Heal at campfires, apples and by freeing villagers.",
    "Gentle wildlife only runs away. Only monsters and bosses can hurt you.",
    "Beam: fill the blue meter by fighting, then unleash it through many monsters.",
    "If you fall, an ally can revive you by standing next to you."
  ];
})();
