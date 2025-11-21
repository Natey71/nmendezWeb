import { appendLeaderboardEntry } from '../../src/services/powerGridLeaderboard.js';

const index = Number(process.argv[2] ?? 0);

async function run() {
  try {
    await appendLeaderboardEntry({
      name: `Process ${index + 1}`,
      score: 10_000 + index * 123,
      profit: 5_000 + index,
      uptime: 95,
      emissions: 12 + index,
    });
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run();
