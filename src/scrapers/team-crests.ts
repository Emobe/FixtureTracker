/**
 * Known team crest images, sourced from Wikipedia's public REST summary API
 * (en.wikipedia.org/api/rest_v1/page/summary/<title>) — the same images
 * Wikipedia itself displays for identification purposes. Keyed by the
 * sport-namespaced team slug (see `getOrCreateTeam` in db-helpers.ts).
 *
 * These are trademarked club/county marks; this mapping is fine for a local
 * dev project, but don't assume it's cleared for reuse if this app is ever
 * deployed publicly — verify licensing per team first.
 */
export const TEAM_CRESTS: Record<string, string> = {
  "gaa-football-armagh": "https://upload.wikimedia.org/wikipedia/en/5/51/Armagh_GAA_crest.png",
  "gaa-football-cavan": "https://upload.wikimedia.org/wikipedia/en/c/c4/Cavan_GAA_crest.png",
  "gaa-football-cork": "https://upload.wikimedia.org/wikipedia/en/c/cd/Cork_GAA_crest.svg",
  "gaa-football-derry": "https://upload.wikimedia.org/wikipedia/en/5/5e/Derry_Crest_GAA.png",
  "gaa-football-donegal": "https://upload.wikimedia.org/wikipedia/en/0/01/Donegal_GAA_crest.png",
  "gaa-football-dublin": "https://upload.wikimedia.org/wikipedia/en/c/cf/Dublin_GAA_crest.svg",
  "gaa-football-galway": "https://upload.wikimedia.org/wikipedia/en/a/a9/Galway_GAA_crest.svg",
  "gaa-football-kerry": "https://upload.wikimedia.org/wikipedia/en/3/39/Kerry_gaa_crest.png",
  "gaa-football-kildare": "https://upload.wikimedia.org/wikipedia/en/d/de/Kildare_GAA_crest.png",
  "gaa-football-louth": "https://upload.wikimedia.org/wikipedia/en/c/ce/Louth_GAA_crest.jpg",
  "gaa-football-mayo": "https://upload.wikimedia.org/wikipedia/en/0/0a/Mayo_GAA_crest.jpg",
  "gaa-football-meath": "https://upload.wikimedia.org/wikipedia/en/d/d2/Meath_GAA_crest.svg",
  "gaa-football-monaghan": "https://upload.wikimedia.org/wikipedia/en/a/a0/Monaghan_GAA_crest.jpg",
  "gaa-football-roscommon": "https://upload.wikimedia.org/wikipedia/en/c/cf/Roscommon_GAA_crest.svg",
  "gaa-football-tyrone": "https://upload.wikimedia.org/wikipedia/en/2/23/Tyrone_gaa_logo.png",
  "gaa-football-westmeath": "https://upload.wikimedia.org/wikipedia/en/b/b8/Westmeath_GAA_crest.jpg",

  "gaa-hurling-clare": "https://upload.wikimedia.org/wikipedia/en/c/ce/Clare_GAA_crest.png",
  "gaa-hurling-cork": "https://upload.wikimedia.org/wikipedia/en/c/cd/Cork_GAA_crest.svg",
  "gaa-hurling-dublin": "https://upload.wikimedia.org/wikipedia/en/c/cf/Dublin_GAA_crest.svg",
  "gaa-hurling-galway": "https://upload.wikimedia.org/wikipedia/en/a/a9/Galway_GAA_crest.svg",
  "gaa-hurling-limerick": "https://upload.wikimedia.org/wikipedia/en/3/31/Limerick_GAA_crest.jpg",
  "gaa-hurling-offaly": "https://upload.wikimedia.org/wikipedia/en/b/bf/Offaly_GAA_crest.jpg",

  "rugby-league-bradford-bulls": "https://upload.wikimedia.org/wikipedia/en/1/1f/2025_Bradford_Bulls_Logo.png",
  "rugby-league-castleford-tigers": "https://upload.wikimedia.org/wikipedia/en/b/bd/Castleford_Tigers_new_logo.png",
  "rugby-league-catalans-dragons": "https://upload.wikimedia.org/wikipedia/en/c/cc/Catalans_Dragons_logo_2008.png",
  "rugby-league-huddersfield-giants": "https://upload.wikimedia.org/wikipedia/en/4/42/Huddersfield_Giants_2021_logo.png",
  "rugby-league-hull-f-c": "https://upload.wikimedia.org/wikipedia/en/0/08/Hull_F.C._logo.svg",
  "rugby-league-hull-kr": "https://upload.wikimedia.org/wikipedia/en/3/3c/Hull_Kingston_Rovers_Crest.png",
  "rugby-league-leeds-rhinos": "https://upload.wikimedia.org/wikipedia/en/6/6f/Leeds_Rhinos_logo.svg",
  "rugby-league-leigh-leopards": "https://upload.wikimedia.org/wikipedia/en/b/b2/Leigh_Leopards_Rugby_League_Team_Logo.png",
  "rugby-league-st-helens": "https://upload.wikimedia.org/wikipedia/en/2/2f/St_Helens_RFC_logo.svg",
  "rugby-league-toulouse-olympique": "https://upload.wikimedia.org/wikipedia/en/f/fe/Toulouse_Olympique_new_logo.png",
  "rugby-league-wakefield-trinity": "https://upload.wikimedia.org/wikipedia/en/9/9e/Wakey_new_logo.png",
  "rugby-league-warrington-wolves": "https://upload.wikimedia.org/wikipedia/en/7/75/Warringtonwolveslogo.svg",
  "rugby-league-wigan-warriors": "https://upload.wikimedia.org/wikipedia/en/d/d7/Wigan_Warriors_Logo%2C_November_2020.svg",
  "rugby-league-york-knights": "https://upload.wikimedia.org/wikipedia/en/5/5c/York_RLFC_Knights_logo.webp",
};
