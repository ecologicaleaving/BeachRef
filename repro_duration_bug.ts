
import { calculateTotalDuration, parseTimeString } from './utils/MatchDurationFormatter';

console.log("Testing parseTimeString with '25' (expected 1500 seconds or similar if treated as minutes):");
const result1 = parseTimeString('25');
console.log(`Result: ${result1}`);

console.log("Testing calculateTotalDuration with '25', '25', '15' (expected ~65m):");
const result2 = calculateTotalDuration('25', '25', '15');
console.log(`Result: ${result2}`);

// Simulate MatchListV2 logic
const durationSet1 = '25';
const durationSet2 = '25';
const durationSet3 = '15';

console.log("Simulating MatchListV2 logic:");
const isStringFormat = typeof durationSet1 === 'string' && durationSet1.includes(':');
console.log(`isStringFormat: ${isStringFormat}`);

if (isStringFormat) {
    console.log("Using calculateTotalDuration");
} else {
    console.log("Using parseInt logic (assuming seconds)");
    const totalSeconds = (parseInt(durationSet1 || '0') +
        parseInt(durationSet2 || '0') +
        parseInt(durationSet3 || '0'));
    console.log(`totalSeconds: ${totalSeconds}`);

    const totalMinutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    console.log(`Formatted: ${hours}h ${minutes}m`);
}
