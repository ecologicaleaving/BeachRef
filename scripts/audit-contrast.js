/**
 * Script to audit current dark theme contrast ratios
 * Part of Story 5.1.1 implementation
 */

const { 
  auditCurrentDarkTheme,
  CURRENT_DARK_COLORS,
  ENHANCED_DARK_COLORS 
} = require('../utils/accessibility/contrast-validation.ts');

console.log('🔍 DARK THEME CONTRAST AUDIT - STORY 5.1.1');
console.log('============================================\n');

console.log('📊 Current Dark Theme Colors:');
Object.entries(CURRENT_DARK_COLORS).forEach(([key, value]) => {
  console.log(`  ${key}: ${value}`);
});

console.log('\n✨ Enhanced WCAG 2.1 AA Colors:');
Object.entries(ENHANCED_DARK_COLORS).forEach(([key, value]) => {
  console.log(`  ${key}: ${value}`);
});

console.log('\n🎯 CONTRAST RATIO ANALYSIS:');
console.log('===========================');

try {
  const results = auditCurrentDarkTheme();
  
  results.forEach(result => {
    const status = result.currentPasses ? '✅' : '❌';
    const enhancedStatus = result.enhancedPasses ? '✅' : '❌';
    
    console.log(`\n${result.pair}:`);
    console.log(`  Current:  ${result.current}:1 ${status} ${result.currentPasses ? 'PASSES' : 'FAILS'} WCAG AA`);
    console.log(`  Enhanced: ${result.enhanced}:1 ${enhancedStatus} ${result.enhancedPasses ? 'PASSES' : 'FAILS'} WCAG AA`);
    console.log(`  Improvement: +${result.improvement}:1 contrast ratio`);
  });
  
  const failingCurrent = results.filter(r => !r.currentPasses).length;
  const passingEnhanced = results.filter(r => r.enhancedPasses).length;
  
  console.log('\n📈 SUMMARY:');
  console.log(`  Failing current ratios: ${failingCurrent}/${results.length}`);
  console.log(`  Enhanced ratios passing: ${passingEnhanced}/${results.length}`);
  
  if (failingCurrent > 0) {
    console.log('\n🚨 WCAG 2.1 AA VIOLATIONS DETECTED');
    console.log('   Story 5.1.1 implementation REQUIRED');
  } else {
    console.log('\n✅ All contrast ratios meet WCAG 2.1 AA standards');
  }
  
} catch (error) {
  console.error('❌ Error running contrast audit:', error.message);
}