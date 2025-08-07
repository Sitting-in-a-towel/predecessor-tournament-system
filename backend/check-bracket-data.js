const postgresService = require('./services/postgresql');

async function checkBracketData() {
  try {
    const query = `
      SELECT tournament_id, is_published, updated_at, 
             CASE 
               WHEN LENGTH(bracket_data::text) > 100 
               THEN CONCAT(LEFT(bracket_data::text, 100), '...')
               ELSE bracket_data::text
             END as bracket_preview
      FROM tournament_brackets 
      WHERE tournament_id = (
        SELECT id FROM tournaments 
        WHERE tournament_id = '67e81a0d-1165-4481-ad58-85da372f86d5'
      )
      ORDER BY updated_at DESC
    `;
    
    const result = await postgresService.query(query);
    
    if (result.rows.length > 0) {
      console.log('Current bracket record:');
      console.log('Tournament UUID:', result.rows[0].tournament_id);
      console.log('Published:', result.rows[0].is_published);
      console.log('Last Updated:', result.rows[0].updated_at);
      console.log('Bracket Data Preview:', result.rows[0].bracket_preview);
    } else {
      console.log('No bracket data found for this tournament');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkBracketData();