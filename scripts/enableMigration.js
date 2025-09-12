/**
 * Migration Enablement Script
 * Safely enables the new hook-based data management with feature flags
 * 
 * Usage:
 * - To enable all hooks: node scripts/enableMigration.js --enable-all
 * - To enable specific hook: node scripts/enableMigration.js --enable-matches
 * - To gradual rollout: node scripts/enableMigration.js --gradual-matches 25
 * - To check status: node scripts/enableMigration.js --status
 */

const AsyncStorage = require('@react-native-async-storage/async-storage');
const args = process.argv.slice(2);

async function main() {
  console.log('🚀 BeachRef Migration Tool');
  console.log('============================');
  
  if (args.includes('--status')) {
    await showMigrationStatus();
    return;
  }
  
  if (args.includes('--enable-all')) {
    await enableAllHooks();
    return;
  }
  
  if (args.includes('--enable-matches')) {
    await enableHook('matches');
    return;
  }
  
  if (args.includes('--enable-tournaments')) {
    await enableHook('tournaments');
    return;
  }
  
  if (args.includes('--enable-referees')) {
    await enableHook('referees');
    return;
  }
  
  const gradualMatches = args.findIndex(arg => arg === '--gradual-matches');
  if (gradualMatches !== -1 && args[gradualMatches + 1]) {
    const percentage = parseInt(args[gradualMatches + 1]);
    await gradualRollout('matches', percentage);
    return;
  }
  
  const gradualTournaments = args.findIndex(arg => arg === '--gradual-tournaments');
  if (gradualTournaments !== -1 && args[gradualTournaments + 1]) {
    const percentage = parseInt(args[gradualTournaments + 1]);
    await gradualRollout('tournaments', percentage);
    return;
  }
  
  const gradualReferees = args.findIndex(arg => arg === '--gradual-referees');
  if (gradualReferees !== -1 && args[gradualReferees + 1]) {
    const percentage = parseInt(args[gradualReferees + 1]);
    await gradualRollout('referees', percentage);
    return;
  }
  
  if (args.includes('--disable-all')) {
    await disableAllHooks();
    return;
  }
  
  showUsage();
}

async function showMigrationStatus() {
  try {
    const flags = await getFeatureFlags();
    const statuses = await getMigrationStatuses();
    
    console.log('📊 Current Migration Status');
    console.log('----------------------------');
    console.log(`✅ Tournaments Hook: ${flags.useNewTournamentsHook ? 'ENABLED' : 'DISABLED'}`);
    console.log(`✅ Matches Hook: ${flags.useNewMatchesHook ? 'ENABLED' : 'DISABLED'}`);
    console.log(`✅ Referees Hook: ${flags.useNewRefereesHook ? 'ENABLED' : 'DISABLED'}`);
    console.log(`🔧 Performance Comparison: ${flags.enablePerformanceComparison ? 'ENABLED' : 'DISABLED'}`);
    console.log(`📝 Migration Logging: ${flags.enableMigrationLogging ? 'ENABLED' : 'DISABLED'}`);
    console.log(`🛡️  Auto-Rollback: ${flags.enableRollbackOnError ? 'ENABLED' : 'DISABLED'}`);
    console.log(`⚠️  Error Threshold: ${flags.maxErrorThreshold || 5} errors`);
    
    console.log('\n🏗️  Component Status');
    console.log('-------------------');
    statuses.forEach(status => {
      console.log(`${status.usingNewHook ? '✅' : '❌'} ${status.component}`);
      if (status.errorCount > 0) {
        console.log(`   ⚠️  Errors: ${status.errorCount} (Last: ${status.lastError || 'Unknown'})`);
      }
      if (status.performanceComparison) {
        const perf = status.performanceComparison;
        console.log(`   📈 Performance: ${perf.improvement.toFixed(1)}% improvement (${perf.oldSystemTime}ms → ${perf.newSystemTime}ms)`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error reading migration status:', error.message);
  }
}

async function enableAllHooks() {
  console.log('🚀 Enabling all hooks...');
  
  const flags = {
    useNewTournamentsHook: true,
    useNewMatchesHook: true,
    useNewRefereesHook: true,
    enablePerformanceComparison: true,
    enableMigrationLogging: true,
    enableRollbackOnError: true,
    maxErrorThreshold: 5
  };
  
  await setFeatureFlags(flags);
  console.log('✅ All hooks enabled successfully!');
  console.log('💡 Monitor the app for performance and errors');
  console.log('📊 Check status with: node scripts/enableMigration.js --status');
}

async function enableHook(hookType) {
  console.log(`🚀 Enabling ${hookType} hook...`);
  
  const flagKey = `useNew${hookType.charAt(0).toUpperCase() + hookType.slice(1)}Hook`;
  const flags = await getFeatureFlags();
  flags[flagKey] = true;
  
  await setFeatureFlags(flags);
  console.log(`✅ ${hookType} hook enabled successfully!`);
}

async function gradualRollout(hookType, percentage) {
  console.log(`🎲 Starting gradual rollout for ${hookType} hook at ${percentage}%...`);
  
  const shouldEnable = Math.random() * 100 < percentage;
  const flagKey = `useNew${hookType.charAt(0).toUpperCase() + hookType.slice(1)}Hook`;
  const flags = await getFeatureFlags();
  flags[flagKey] = shouldEnable;
  
  await setFeatureFlags(flags);
  console.log(`${shouldEnable ? '✅' : '❌'} ${hookType} hook ${shouldEnable ? 'enabled' : 'disabled'} for this instance (${percentage}% rollout)`);
}

async function disableAllHooks() {
  console.log('🛑 Disabling all hooks...');
  
  const flags = await getFeatureFlags();
  flags.useNewTournamentsHook = false;
  flags.useNewMatchesHook = false;
  flags.useNewRefereesHook = false;
  
  await setFeatureFlags(flags);
  console.log('✅ All hooks disabled (rollback complete)');
}

async function getFeatureFlags() {
  const defaultFlags = {
    useNewTournamentsHook: false,
    useNewMatchesHook: false,
    useNewRefereesHook: false,
    enablePerformanceComparison: true,
    enableMigrationLogging: true,
    enableRollbackOnError: true,
    maxErrorThreshold: 5
  };
  
  try {
    const storedFlags = await AsyncStorage.getItem('@feature_flags');
    return storedFlags ? { ...defaultFlags, ...JSON.parse(storedFlags) } : defaultFlags;
  } catch (error) {
    return defaultFlags;
  }
}

async function getMigrationStatuses() {
  try {
    const storedStatuses = await AsyncStorage.getItem('@migration_statuses');
    if (storedStatuses) {
      const statusArray = JSON.parse(storedStatuses);
      return statusArray.map(([, status]) => status);
    }
    return [];
  } catch (error) {
    return [];
  }
}

async function setFeatureFlags(flags) {
  try {
    await AsyncStorage.setItem('@feature_flags', JSON.stringify(flags));
  } catch (error) {
    throw new Error(`Failed to save feature flags: ${error.message}`);
  }
}

function showUsage() {
  console.log('📚 Usage Examples:');
  console.log('------------------');
  console.log('node scripts/enableMigration.js --status              # Show current status');
  console.log('node scripts/enableMigration.js --enable-all          # Enable all hooks');
  console.log('node scripts/enableMigration.js --enable-matches      # Enable matches hook only');
  console.log('node scripts/enableMigration.js --gradual-matches 25  # 25% rollout for matches');
  console.log('node scripts/enableMigration.js --disable-all         # Emergency rollback');
  console.log('');
  console.log('🔄 Recommended Migration Path:');
  console.log('1. Start with gradual rollout: --gradual-matches 10');
  console.log('2. Monitor for 24h, check --status for errors');
  console.log('3. Increase gradually: --gradual-matches 25, then 50, then 100');
  console.log('4. Repeat for tournaments and referees hooks');
}

main().catch(error => {
  console.error('❌ Script failed:', error.message);
  process.exit(1);
});