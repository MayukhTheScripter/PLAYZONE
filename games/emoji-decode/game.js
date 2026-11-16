/* Emoji Decode - guess the movie, phrase, food or place from emoji. */
(function () {
  var ENGINES = Hub.ENGINES, Kit = Hub.Kit;
  // [difficulty, emoji, answer, [three wrong options], category]
  var P = [
    [0, "🦁👑", "The Lion King", ["The Jungle Book", "Madagascar", "Tarzan"], "Movie"],
    [0, "🧊👸❄️", "Frozen", ["Tangled", "Brave", "Cinderella"], "Movie"],
    [0, "🕷️🧑", "Spider-Man", ["Batman", "Ant-Man", "Iron Man"], "Movie"],
    [0, "🦈🌊", "Jaws", ["Finding Nemo", "Titanic", "Aquaman"], "Movie"],
    [0, "🚢🧊💔", "Titanic", ["Frozen", "Poseidon", "Cast Away"], "Movie"],
    [0, "🐠🔍", "Finding Nemo", ["The Little Mermaid", "Shark Tale", "Moana"], "Movie"],
    [0, "🧙‍♂️⚡👓", "Harry Potter", ["Lord of the Rings", "Merlin", "Doctor Strange"], "Movie"],
    [0, "🐀👨‍🍳🇫🇷", "Ratatouille", ["Stuart Little", "Chef", "Paddington"], "Movie"],
    [0, "🍕", "Pizza", ["Pasta", "Burger", "Taco"], "Food"],
    [0, "🍔🍟", "Burger and fries", ["Hot dog and chips", "Pizza and salad", "Fish and chips"], "Food"],
    [0, "🍣🇯🇵", "Sushi", ["Ramen", "Tempura", "Dumplings"], "Food"],
    [0, "🍝🇮🇹", "Spaghetti", ["Lasagna", "Risotto", "Pizza"], "Food"],
    [0, "🗼🇫🇷", "Eiffel Tower", ["Big Ben", "Leaning Tower", "Space Needle"], "Place"],
    [0, "🗽🇺🇸", "Statue of Liberty", ["Golden Gate Bridge", "White House", "Mount Rushmore"], "Place"],
    [0, "🏯🌸🇯🇵", "Japan", ["China", "Korea", "Thailand"], "Place"],
    [0, "🐼🇨🇳", "China", ["Japan", "India", "Australia"], "Place"],
    [0, "🦘🇦🇺", "Australia", ["New Zealand", "Brazil", "South Africa"], "Place"],
    [0, "☔🐱🐶", "Raining cats and dogs", ["Pet shop", "Cat nap", "Dog days"], "Phrase"],
    [0, "🎂🎉", "Happy birthday", ["Wedding day", "New Year", "Good luck"], "Phrase"],
    [0, "🌞🌻", "Sunflower", ["Daisy", "Sunshine", "Summer rose"], "Phrase"],
    [1, "🧛🦇", "Dracula", ["Batman", "Twilight", "Nosferatu Jr"], "Movie"],
    [1, "🚀🌌⚔️", "Star Wars", ["Star Trek", "Guardians", "Interstellar"], "Movie"],
    [1, "🦖🌴🧬", "Jurassic Park", ["King Kong", "Godzilla", "The Land Before Time"], "Movie"],
    [1, "🧸🤠🚀", "Toy Story", ["Wall-E", "Teddy Bear", "Buzz Lightyear's Tale"], "Movie"],
    [1, "👻🚫📞", "Ghostbusters", ["Casper", "Scream", "The Haunting"], "Movie"],
    [1, "🏝️🏐👨", "Cast Away", ["Lost", "Survivor", "Robinson Crusoe"], "Movie"],
    [1, "🐘✈️👂", "Dumbo", ["Babar", "Hathi", "Madagascar"], "Movie"],
    [1, "🧞‍♂️🪔🐒", "Aladdin", ["Kung Fu Panda", "Sinbad", "Genie"], "Movie"],
    [1, "🧜‍♀️🦀🐚", "The Little Mermaid", ["Moana", "Finding Dory", "Splash"], "Movie"],
    [1, "🎤👑🐝", "Queen Bee", ["Rock Queen", "Sing", "Bee Movie"], "Song"],
    [1, "💃🌙🕺", "Dancing in the Moonlight", ["Night Fever", "Moon River", "Dancing Queen"], "Song"],
    [1, "🌈🦄✨", "Over the Rainbow", ["Unicorn Dreams", "Magic Carpet", "Somewhere"], "Song"],
    [1, "🥞🍁", "Pancakes with syrup", ["Waffles with jam", "French toast", "Crepes"], "Food"],
    [1, "🌮🇲🇽", "Taco", ["Burrito", "Nachos", "Quesadilla"], "Food"],
    [1, "🥐☕🇫🇷", "Croissant and coffee", ["Bagel and tea", "Donut and milk", "Toast and juice"], "Food"],
    [1, "🏛️🇬🇷", "Greece", ["Italy", "Egypt", "Turkey"], "Place"],
    [1, "🔺🐪🇪🇬", "Egypt", ["Morocco", "Saudi Arabia", "Mexico"], "Place"],
    [1, "🎡🇬🇧🕰️", "London", ["Paris", "Dublin", "Edinburgh"], "Place"],
    [1, "🧊🐧❄️🌍", "Antarctica", ["Alaska", "Greenland", "Iceland"], "Place"],
    [1, "🐦🪨🎯", "Kill two birds with one stone", ["Early bird", "Stone cold", "Rock the boat"], "Idiom"],
    [1, "🍰👀", "Piece of cake", ["Cherry on top", "Sweet tooth", "Half baked"], "Idiom"],
    [1, "🧊💬", "Break the ice", ["Cold shoulder", "Ice cream", "On thin ice"], "Idiom"],
    [1, "🐘🏠", "Elephant in the room", ["Big house", "Zoo keeper", "Trunk call"], "Idiom"],
    [1, "🌧️☀️🌈", "After the storm comes the rainbow", ["Weather report", "Sunny side up", "Rain check"], "Idiom"],
    [2, "🧑‍🚀🌽🌌", "Interstellar", ["The Martian", "Gravity", "Apollo 13"], "Movie"],
    [2, "🛌💭🌀", "Inception", ["Dreamcatcher", "The Matrix", "Shutter Island"], "Movie"],
    [2, "🐒🏙️🏢", "King Kong", ["Planet of the Apes", "Mighty Joe Young", "Tarzan"], "Movie"],
    [2, "🥷🐢🍕", "Teenage Mutant Ninja Turtles", ["Kung Fu Panda", "Shell Shock", "Master Splinter"], "Movie"],
    [2, "🔴🔵💊🕶️", "The Matrix", ["Men in Black", "Blade Runner", "Limitless"], "Movie"],
    [2, "🍫🏭🎫", "Charlie and the Chocolate Factory", ["Willy's Adventure", "The Candy Man", "Matilda"], "Movie"],
    [2, "🐺🌕🧍", "Werewolf", ["Wolf of Wall Street", "Twilight", "Teen Wolf Pack"], "Movie"],
    [2, "👨‍🍳🔪🐟", "Sushi chef", ["Fishing trip", "Fish and chips", "Knife skills"], "Food"],
    [2, "🥚🍳🇫🇷", "Omelette", ["Quiche", "Souffle", "Crepe"], "Food"],
    [2, "🌊🏄‍♂️🌺", "Hawaii", ["Fiji", "Bali", "Tahiti"], "Place"],
    [2, "🕌🌅🐫", "Dubai", ["Cairo", "Istanbul", "Marrakech"], "Place"],
    [2, "🎻🏰🇦🇹", "Vienna", ["Prague", "Berlin", "Budapest"], "Place"],
    [2, "🐈⬛🪞🔮", "Black cat superstition", ["Magic mirror", "Fortune teller", "Haunted house"], "Phrase"],
    [2, "🐴🎁👄", "Don't look a gift horse in the mouth", ["Horse whisperer", "Gift wrap", "Hold your horses"], "Idiom"],
    [2, "🐟💧🚫", "Fish out of water", ["Rainy day", "Drop in the ocean", "Big fish small pond"], "Idiom"],
    [2, "🥚🧺🚫", "Don't put all your eggs in one basket", ["Easter egg hunt", "Walking on eggshells", "Egg on your face"], "Idiom"],
    [2, "🔥🧊🎶", "Fire and Ice", ["Hot and Cold", "Burning Love", "Let It Go"], "Song"],
    [2, "🌙🚶‍♂️🕺", "Moonwalk", ["Night Moves", "Smooth Criminal", "Thriller"], "Song"],
    [2, "🔑🗝️🚪❓", "Locked out", ["Key to the city", "Open door policy", "Secret garden"], "Phrase"]
  ];

  ENGINES.emojidecode = function (C) {
    var used = {};
    return Kit.quiz(C, {
      rounds: 5, time: [16, 13, 10], cpuAcc: [0.65, 0.8, 0.93],
      make: function (lv) {
        var pool = P.filter(function (p) { return !used[p[1]] && p[0] <= lv; });
        if (!pool.length) { used = {}; pool = P.filter(function (p) { return p[0] <= lv; }); }
        var pref = pool.filter(function (p) { return p[0] === lv; });
        var p = Kit.pick(pref.length && Math.random() < 0.7 ? pref : pool);
        used[p[1]] = 1;
        var opts = [p[2]].concat(p[3]);
        for (var i = opts.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = opts[i]; opts[i] = opts[j]; opts[j] = t; }
        return { q: '<span class="ed-cat">' + p[4] + '</span><span class="ed-emo">' + p[1] + '</span>', opts: opts, ans: opts.indexOf(p[2]), hint: p[1] + " = " + p[2] };
      }
    });
  };

  Hub.register({
    "id": "emojidecode",
    "name": "Emoji Decode",
    "hue": 175,
    "kind": "Turns",
    "mins": 3,
    "rules": "Each player answers 5 puzzles in turn. Every puzzle is a row of emoji standing for a movie, song, food, place or phrase. Pick the right answer from four options before the time runs out. A right answer scores 10 points plus up to 10 for speed. Highest total wins.",
    "desc": "Guess the movie, place or phrase from emoji.",
    "icon": "<circle class=\"st\" cx=\"40\" cy=\"40\" r=\"24\"/><circle class=\"fl\" cx=\"32\" cy=\"34\" r=\"3\"/><circle class=\"fl\" cx=\"48\" cy=\"34\" r=\"3\"/><path class=\"st\" d=\"M30 48q10 10 20 0\"/>",
    "teams": false,
    "diff": "Easy: very well-known puzzles, 16 s. Medium: some trickier ones, 13 s. Hard: tough puzzles, 10 s."
  });
})();
