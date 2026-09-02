// Fill these in from Supabase → Project Settings → API.
// The publishable key is designed to be public; RLS protects the data.
window.INBOX = {
  SUPABASE_URL: "https://qaabxgldjluqyccwhjzf.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_174ADmpQYYVspwAiMCL_ig_sAxe5ymU",

  // Used to render event times and prefill Google Calendar links.
  TIMEZONE: "America/New_York",

  // The hour (0-23) at which "today" rolls over to tomorrow.
  // 3 means 12:10am still counts as the previous day.
  DAY_ROLLOVER_HOUR: 3,

  // Grocery categories in the order you walk the store.
  // Must match the list inside the edge function.
  GROCERY_ORDER: [
    "Produce","Deli","Bakery","Seafood","Meat","Pickles","Dairy","Frozen Foods",
    "Pet Supplies","Cooking & Baking","Spices","Breakfast & Cereal",
    "Grains, Pasta & Sides","Soups & Canned Goods","Condiments & Dressings",
    "Wine, Beer & Spirits","Snacks","Beverages","Baby","Health & Personal Care",
    "Household & Cleaning","Other"
  ],

  // Deterministic aisle rules (packet 004). Keys are lowercase substrings matched
  // against the normalized item text; longest match wins. Not exhaustive by design —
  // a miss lands in "Other" and one correction teaches it permanently via grocery_prefs.
  GROCERY_KEYWORDS: {
    "Produce": ["apple","asparagus","avocado","banana","basil","thai basil","bell pepper","green bell pepper","berries","blueberr","broccoli","cabbage","green cabbage","carrot","celery","cherries","cherry tomato","roma tomato","cilantro","cucumber","garlic","grapes","greens","kale","lemon","lettuce","lime","mushroom","shiitake mushroom","nectarine","onion","orange","parsley","peach","pear","plum","potato","salad","scallion","spinach","strawberr","tomato","zucchini"],
    "Deli": ["deli","lunch meat","laughing cow","prosciutto","salami","ham","turkey slices"],
    "Bakery": ["bread","seedless bread","baguette","bagel","muffin","croissant","roll","bun","tortilla","pita","cake","donut"],
    "Seafood": ["salmon","shrimp","tuna","cod","tilapia","fish","scallop","crab"],
    "Meat": ["chicken","chicken breast","chicken wings","beef","pork","steak","bacon","sausage","ground turkey","ribs"],
    "Pickles": ["pickle","olives","kimchi","sauerkraut"],
    "Dairy": ["milk","oat milk","butter","cheese","cheddar","sharp cheddar","parmesan","feta","mozzarella","yogurt","kefir","egg","cream","half and half","sour cream","cottage cheese","string cheese","creamer","coffee creamer"],
    "Frozen Foods": ["frozen","ice cream","vegan ice cream","uncrustables","indian triangles","brazilian cheese balls","frozen pizza","waffles"],
    "Pet Supplies": ["dog food","cat food","wet cat food","dry cat food","cat litter","dog treats"],
    "Cooking & Baking": ["flour","tapioca flour","sugar","brown sugar","olive oil","oil","baking powder","baking soda","vanilla","cornstarch","yeast","chocolate chips"],
    "Spices": ["salt","black pepper","cumin","paprika","cinnamon","oregano","turmeric","chili powder","spice"],
    "Breakfast & Cereal": ["cereal","oatmeal","oats","granola","pancake mix","syrup"],
    "Grains, Pasta & Sides": ["pasta","rice","quinoa","couscous","noodles","spaghetti","macaroni"],
    "Soups & Canned Goods": ["soup","canned","canned pineapple","broth","stock","chicken stock","crushed tomatoes","coconut milk","butter beans","black beans","chickpeas","tomato paste"],
    "Condiments & Dressings": ["ketchup","mustard","mayonnaise","mayo","soy sauce","hoisin","sauce","hot sauce","sriracha","dressing","vinegar","rice vinegar","curry paste","thai green curry paste","thai red curry paste","salsa","jam","jelly","peanut butter","honey"],
    "Wine, Beer & Spirits": ["wine","beer","vodka","whiskey","tequila","gin","rum"],
    "Snacks": ["chips","crackers","cookies","pretzels","dots pretzels","popcorn","nuts","almonds","sunflower seeds","jerky","beef jerky","candy","dark chocolate","chocolate granola","granola bar","biscotti","cheese balls","trail mix"],
    "Beverages": ["juice","soda","coffee","tea","tea bags","coconut water","water","sparkling water","lemonade","kombucha"],
    "Baby": ["baby","diapers","baby wipes","formula","baby food"],
    "Health & Personal Care": ["shampoo","toothpaste","deodorant","vitamins","medicine","meds","ibuprofen","tylenol","band aid","lotion","razor"],
    "Household & Cleaning": ["paper towels","toilet paper","trash bags","soap","dish soap","detergent","dishwasher detergent","laundry detergent","sponge","foil","aluminium foil","aluminum foil","ziploc","plastic wrap","cleaner","bleach"]
  },

  // To-do tags. Must match the list inside the edge function.
  TAGS: ["personal","new-orbit","ews","ptc","gtfo"],
};

// Build beacon — bumped by every unit that ships a web/ change. Deploy proof.
window.INBOX_VERSION = "004-B";
console.log("inbox build", window.INBOX_VERSION);
