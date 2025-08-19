const postgres = require('../services/postgresql');

postgres.query(`
  SELECT 
    t.name, 
    t.id, 
    t.tournament_id, 
    tb.id as bracket_id, 
    tb.is_published 
  FROM tournaments t 
  LEFT JOIN tournament_brackets tb ON tb.tournament_id = t.id 
  ORDER BY t.created_at DESC
`)
.then(result => {
  console.log('Tournaments with bracket status:');
  result.rows.forEach(row => {
    console.log(`${row.name}: bracket=${row.bracket_id ? 'YES' : 'NO'} published=${row.is_published || 'N/A'}`);
  });
  process.exit(0);
}).catch(error => {
  console.error('Error:', error);
  process.exit(1);
});