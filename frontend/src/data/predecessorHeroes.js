// Predecessor Heroes Data
// Images should be placed in public/heroes/ directory

export const predecessorHeroes = [
  // Offlane Heroes
  { id: 'grux', name: 'Grux', role: 'Offlane', image: '/heroes/grux.jpg' },
  { id: 'kwang', name: 'Kwang', role: 'Offlane', image: '/heroes/kwang.jpg' },
  { id: 'sevarog', name: 'Sevarog', role: 'Offlane', image: '/heroes/sevarog.jpg' },
  { id: 'steel', name: 'Steel', role: 'Offlane', image: '/heroes/steel.jpg' },
  { id: 'terra', name: 'Terra', role: 'Offlane', image: '/heroes/terra.jpg' },
  { id: 'zinx', name: 'Zinx', role: 'Offlane', image: '/heroes/zinx.jpg' },
  { id: 'boris', name: 'Boris', role: 'Offlane', image: '/heroes/boris.jpg' },
  { id: 'greystone', name: 'Greystone', role: 'Offlane', image: '/heroes/greystone.jpg' },
  
  // Jungle Heroes
  { id: 'khaimera', name: 'Khaimera', role: 'Jungle', image: '/heroes/khaimera.jpg' },
  { id: 'rampage', name: 'Rampage', role: 'Jungle', image: '/heroes/rampage.jpg' },
  { id: 'kallari', name: 'Kallari', role: 'Jungle', image: '/heroes/kallari.jpg' },
  { id: 'feng_mao', name: 'Feng Mao', role: 'Jungle', image: '/heroes/feng_mao.jpg' },
  { id: 'crunch', name: 'Crunch', role: 'Jungle', image: '/heroes/crunch.jpg' },
  { id: 'kira', name: 'Kira', role: 'Jungle', image: '/heroes/kira.jpg' },
  { id: 'grux_jungle', name: 'Grux', role: 'Jungle', image: '/heroes/grux.jpg' },
  { id: 'sevarog_jungle', name: 'Sevarog', role: 'Jungle', image: '/heroes/sevarog.jpg' },
  
  // Midlane Heroes  
  { id: 'gideon', name: 'Gideon', role: 'Midlane', image: '/heroes/gideon.jpg' },
  { id: 'howitzer', name: 'Howitzer', role: 'Midlane', image: '/heroes/howitzer.jpg' },
  { id: 'the_fey', name: 'The Fey', role: 'Midlane', image: '/heroes/the_fey.jpg' },
  { id: 'belica', name: 'Lt. Belica', role: 'Midlane', image: '/heroes/belica.jpg' },
  { id: 'gadget', name: 'Gadget', role: 'Midlane', image: '/heroes/gadget.jpg' },
  { id: 'countess', name: 'Countess', role: 'Midlane', image: '/heroes/countess.jpg' },
  { id: 'shinbi', name: 'Shinbi', role: 'Midlane', image: '/heroes/shinbi.jpg' },
  { id: 'morigesh', name: 'Morigesh', role: 'Midlane', image: '/heroes/morigesh.jpg' },
  { id: 'zarus', name: 'Zarus', role: 'Midlane', image: '/heroes/zarus.jpg' },
  { id: 'argus', name: 'Argus', role: 'Midlane', image: '/heroes/argus.jpg' },
  
  // Carry Heroes
  { id: 'murdock', name: 'Murdock', role: 'Carry', image: '/heroes/murdock.jpg' },
  { id: 'twinblast', name: 'TwinBlast', role: 'Carry', image: '/heroes/twinblast.jpg' },
  { id: 'sparrow', name: 'Sparrow', role: 'Carry', image: '/heroes/sparrow.jpg' },
  { id: 'revenant', name: 'Revenant', role: 'Carry', image: '/heroes/revenant.jpg' },
  { id: 'drongo', name: 'Drongo', role: 'Carry', image: '/heroes/drongo.jpg' },
  { id: 'wraith', name: 'Wraith', role: 'Carry', image: '/heroes/wraith.jpg' },
  { id: 'kira_carry', name: 'Kira', role: 'Carry', image: '/heroes/kira.jpg' },
  { id: 'grimexe', name: 'GRIM.exe', role: 'Carry', image: '/heroes/grimexe.jpg' },
  
  // Support Heroes
  { id: 'muriel', name: 'Muriel', role: 'Support', image: '/heroes/muriel.jpg' },
  { id: 'dekker', name: 'Dekker', role: 'Support', image: '/heroes/dekker.jpg' },
  { id: 'narbash', name: 'Narbash', role: 'Support', image: '/heroes/narbash.jpg' },
  { id: 'phase', name: 'Phase', role: 'Support', image: '/heroes/phase.jpg' },
  { id: 'riktor', name: 'Riktor', role: 'Support', image: '/heroes/riktor.jpg' },
  { id: 'fey_support', name: 'The Fey', role: 'Support', image: '/heroes/the_fey.jpg' },
  { id: 'steel_support', name: 'Steel', role: 'Support', image: '/heroes/steel.jpg' },
  { id: 'aurora', name: 'Aurora', role: 'Support', image: '/heroes/aurora.jpg' }
];

export const getRoleHeroes = (role) => {
  if (role === 'All' || !role) return predecessorHeroes;
  return predecessorHeroes.filter(hero => hero.role === role);
};

export const getHeroById = (id) => {
  return predecessorHeroes.find(hero => hero.id === id);
};

export const roles = ['All', 'Offlane', 'Jungle', 'Midlane', 'Carry', 'Support'];