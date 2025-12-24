import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'leaderboardTopTen'
})
export class LeaderboardTopTenPipe implements PipeTransform {
  transform(records: any[], playerName: string): any[] {
    if (!records) return [];
    // Add rank property
    const withRank = records.map((r, i) => ({ ...r, rank: i + 1 }));
    const topTen = withRank.slice(0, 10);
    const playerRecord = withRank.find(r => r.playerName === playerName);
    if (playerRecord && !topTen.some(r => r.playerName === playerName)) {
      return [...topTen, playerRecord];
    }
    return topTen;
  }
}
