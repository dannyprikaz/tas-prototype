// Single character geohash to continent mapping
// Based on the geographic coverage of each base-32 geohash character
const GEOHASH_TO_CONTINENT = {
  // Northern regions
  'B': 'North America', // Northern Canada, Greenland, Arctic
  'C': 'North America', // Central/Eastern Canada, Northern US
  'F': 'North America', // Eastern US, Eastern Canada
  'G': 'Europe', // Western US, Western Canada
  
  // Central-Northern regions  
  '8': 'North America', // Central North America
  '9': 'North America', // Central North America
  'D': 'North America', // Central-Eastern North America
  
  // Atlantic and Caribbean
  '2': 'Oceania', // Caribbean, Central America
  '3': 'South America', // Caribbean, Northern South America
  '6': 'South America', // Eastern seaboard, Atlantic
  '7': 'South America', // Eastern North America
  
  // South American regions
  '4': 'South America', // Northern South America
  '5': 'Antarctica', // Central South America  
  'H': 'Antarctica', // Eastern South America
  'J': 'Antarctica', // Southern South America
  'N': 'Antarctica', // Southern South America
  
  // European regions
  'U': 'Europe', // Western Europe
  'V': 'Asia', // Central Europe
  'Y': 'Asia', // Northern Europe (Scandinavia)
  'Z': 'Asia', // Eastern Europe, Western Russia
  
  // African regions
  'K': 'Africa', // Western Africa
  'M': 'Africa', // Central/Eastern Africa
  'Q': 'Oceania', // Southern Africa
  'S': 'Africa', // Northern/Eastern Africa
  'T': 'Asia', // Mediterranean Europe, North Africa border
  
  // Asian regions
  'W': 'Asia', // Western/Central Asia, Middle East, Russia
  'X': 'Asia', // Central Asia, Western China, Mongolia
  
  // East Asian regions
  'P': 'Oceania', // Eastern China, Japan, Korea
  'R': 'Oceania', // Southeast Asia, Indonesia, Philippines
  
  // South Asian regions
  'E': 'Africa', // India, Central Asia
  
  // Oceanic regions
  '0': 'Antarctica', // Pacific Ocean, some Pacific islands
  '1': 'Antarctica', // Pacific Ocean, some Pacific islands
};

// Helper function to get continent from single-character geohash
export const getContinentFromGeohash = (geohash) => {
  if (!geohash || typeof geohash !== 'string' || geohash.length === 0) {
    return 'Unknown';
  }
  
  const firstChar = geohash[0].toLowerCase();
  return GEOHASH_TO_CONTINENT[firstChar] || 'Unknown';
};

// Helper function to validate if geohash is continent-level (1 character)
export const isContinentLevel = (geohash) => {
  return geohash && geohash.length === 1;
};