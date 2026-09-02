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

  // To-do tags. Must match the list inside the edge function.
  TAGS: ["personal","new-orbit","ews","ptc","gtfo"],
};

// Build beacon — bumped by every unit that ships a web/ change. Deploy proof.
window.INBOX_VERSION = "004-A";
console.log("inbox build", window.INBOX_VERSION);
