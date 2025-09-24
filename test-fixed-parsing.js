/**
 * Test the fixed Player parsing pattern
 */

const testFixedPlayerParsing = () => {
  console.log('🧪 Testing fixed Player parsing pattern');
  console.log('='.repeat(50));

  // Test with self-closing Player tags (like VIS API)
  const teamXmlSelfClosing = `
      <Player Name="PLAYER1" Federation="ITA" />
      <Player Name="PLAYER2" Federation="ITA" />
  `;

  // Test with regular Player tags (just in case)
  const teamXmlRegular = `
      <Player Name="PLAYER3" Federation="USA">Some content</Player>
      <Player Name="PLAYER4" Federation="USA">More content</Player>
  `;

  // The fixed pattern
  const playerPattern = /<Player[^>]*(?:\/>|>([\s\S]*?)<\/Player>)/gi;

  console.log('🔍 Testing self-closing Player tags:');
  console.log('XML:', teamXmlSelfClosing);

  const players1 = [];
  let playerMatch;

  // Reset the regex
  playerPattern.lastIndex = 0;

  while ((playerMatch = playerPattern.exec(teamXmlSelfClosing)) !== null) {
    console.log('  📋 Raw match:', playerMatch[0]);
    const playerNameMatch = playerMatch[0].match(/Name="([^"]*)"/i);
    if (playerNameMatch) {
      players1.push(playerNameMatch[1]);
      console.log('  ✅ Found player:', playerNameMatch[1]);
    }
  }

  console.log('🎯 Self-closing result:', players1);
  console.log('');

  console.log('🔍 Testing regular Player tags:');
  console.log('XML:', teamXmlRegular);

  const players2 = [];

  // Reset the regex
  playerPattern.lastIndex = 0;

  while ((playerMatch = playerPattern.exec(teamXmlRegular)) !== null) {
    console.log('  📋 Raw match:', playerMatch[0]);
    const playerNameMatch = playerMatch[0].match(/Name="([^"]*)"/i);
    if (playerNameMatch) {
      players2.push(playerNameMatch[1]);
      console.log('  ✅ Found player:', playerNameMatch[1]);
    }
  }

  console.log('🎯 Regular tags result:', players2);

  console.log('');
  console.log('📊 Summary:');
  console.log('  Self-closing players found:', players1.length);
  console.log('  Regular players found:', players2.length);
  console.log('  Both patterns work:', players1.length === 2 && players2.length === 2 ? '✅' : '❌');
};

testFixedPlayerParsing();