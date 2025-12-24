import { Component, OnInit, HostListener, ViewChild, ElementRef, AfterViewChecked, NgZone } from '@angular/core';

interface LeaderboardRecord {
  bestMoves: number | null;
  bestTime: number | null;
  playerName: string;
}

interface LeaderboardData {
  [boardSize: number]: LeaderboardRecord[];
}

@Component({
  selector: 'app-simple-puzzle',
  templateUrl: './simple-puzzle.component.html',
  styleUrls: ['./simple-puzzle.component.scss']
})
export class SimplePuzzleComponent implements OnInit, AfterViewChecked {
  constructor(private ngZone: NgZone) {}
    startTimer(): void {
      this.startTime = Date.now();
      this.timerId = setInterval(() => {
        if (this.startTime !== null) {
          this.elapsedMs = Date.now() - this.startTime;
        }
      }, 100);
    }

    stopTimer(): void {
      if (this.timerId) {
        clearInterval(this.timerId);
        this.timerId = null;
      }
    }
  @ViewChild('playAgainBtn') playAgainBtn!: ElementRef<HTMLButtonElement>;
  
  size = 3; // default board size
  tiles: number[] = [];
  moveCount = 0;
  startTime: number | null = null;
  elapsedMs = 0;
  timerId: any = null;
  hasStarted = false;
  statusMessage = '';
  private wasSolved = false;
  leaderboard: LeaderboardData = {};
  isNewRecord = { moves: false, time: false };
  playerName: string = 'Player 1';
  allPlayerNames: string[] = [];
  addingNewPlayer: boolean = false;
  editingCurrentPlayer: boolean = false;
  editingPlayerName: boolean = false;
  leaderboardView: string = 'current';
  ngOnInit(): void {
    // Load last player name if available
    const storedName = localStorage.getItem('puzzle-player-name');
    if (storedName) {
      this.playerName = storedName;
    }
    // Load all player names from localStorage
    const storedPlayers = localStorage.getItem('puzzle-all-players');
    if (storedPlayers) {
      try {
        this.allPlayerNames = JSON.parse(storedPlayers).sort((a: string, b: string) => a.localeCompare(b));
      } catch {
        this.allPlayerNames = [this.playerName];
      }
    } else {
      this.allPlayerNames = [this.playerName];
    }
    this.addingNewPlayer = false;
    this.editingCurrentPlayer = false;
    this.editingPlayerName = false;
    this.loadLeaderboard();
    this.reset();
  }

  ngAfterViewChecked(): void {
    // Focus play again button when puzzle becomes solved
    if (this.isSolved() && !this.wasSolved && this.playAgainBtn) {
      setTimeout(() => {
        this.playAgainBtn.nativeElement.focus();
      }, 100);
    }
    this.wasSolved = this.isSolved();
  }

  get dimensionStyle() {
    return {
      'grid-template-columns': `repeat(${this.size}, 1fr)`,
      'grid-template-rows': `repeat(${this.size}, 1fr)`
    } as const;
  }

  pause(): void {
    // Pause should only stop an active timer; never start it
    if (this.timerId) {
      this.stopTimer();
      this.statusMessage = 'Game paused';
    }
  }

  resume(): void {
    // Only resume if a game has started previously and not solved
    if (this.hasStarted && this.startTime !== null && !this.isSolved()) {
      this.resumeTimer();
      this.statusMessage = 'Game resumed';
    }
  }

  reset(): void {
    // create ordered tiles with a 0 as empty at the end
    this.tiles = Array.from({ length: this.size * this.size - 1 }, (_, i) => i + 1);
    this.tiles.push(0);
    this.shuffleSolvable();
    this.moveCount = 0;
    this.stopTimer();
    this.elapsedMs = 0;
    this.startTime = null;
    this.hasStarted = false;
    this.wasSolved = false;
  }

  setSize(n: number): void {
    if (n < 3 || n > 10) return;
    if (this.size === n) {
      // Just reshuffle current size
      this.reset();
      return;
    }
    this.size = n;
    this.reset();
  }

  shuffleSolvable(): void {
    const n = this.size * this.size;
    do {
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.tiles[i], this.tiles[j]] = [this.tiles[j], this.tiles[i]];
      }
    } while (!this.isSolvable(this.tiles) || this.isSolved());
  }

  isSolvable(arr: number[]): boolean {
    const flat = arr.filter(v => v !== 0);
    let inversions = 0;
    for (let i = 0; i < flat.length; i++) {
      for (let j = i + 1; j < flat.length; j++) {
        if (flat[i] > flat[j]) inversions++;
      }
    }
    if (this.size % 2 === 1) {
      return inversions % 2 === 0;
    }
    const blankIndex = arr.indexOf(0);
    const blankRowFromBottom = this.size - Math.floor(blankIndex / this.size);
    return (inversions + blankRowFromBottom) % 2 === 1;
  }

  get emptyIndex(): number {
    return this.tiles.indexOf(0);
  }

  canMove(index: number): boolean {
    const empty = this.emptyIndex;
    const r1 = Math.floor(index / this.size);
    const c1 = index % this.size;
    const r2 = Math.floor(empty / this.size);
    const c2 = empty % this.size;
    return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
  }

  move(index: number): void {
    if (this.tiles[index] === 0) return;
    if (!this.canMove(index)) return;
    if (this.startTime === null) this.startTimer();
    this.hasStarted = true;
    const empty = this.emptyIndex;
    [this.tiles[index], this.tiles[empty]] = [this.tiles[empty], this.tiles[index]];
    this.moveCount++;
    if (this.isSolved()) {
      this.stopTimer();
      this.checkAndUpdateRecords();
    }
  }

  isSolved(): boolean {
    for (let i = 0; i < this.tiles.length - 1; i++) {
      if (this.tiles[i] !== i + 1) return false;
    }
    return this.tiles[this.tiles.length - 1] === 0;
  }

  get isRunning(): boolean {
    return this.timerId !== null;
  }

  private resumeTimer(): void {
    // Resume from paused state, keeping elapsed time continuity
    this.startTime = Date.now() - this.elapsedMs;
    this.timerId = setInterval(() => {
      if (this.startTime !== null) {
        this.elapsedMs = Date.now() - this.startTime;
      }
    }, 100);
  }

  end(): void {
    // End should reset to a fresh game: zero moves, zero timer, new shuffle
    this.reset();
    this.statusMessage = 'Game ended. New game ready';
  }

  isPaused(): boolean {
    return this.hasStarted && !this.isRunning && this.startTime !== null && !this.isSolved();
  }

  loadLeaderboard(): void {
    const saved = localStorage.getItem('puzzle-leaderboard-v2');
    if (saved) {
      try {
        this.leaderboard = JSON.parse(saved);
        console.log('Leaderboard loaded:', this.leaderboard);
      } catch {
        this.leaderboard = {};
        console.warn('Failed to parse leaderboard from localStorage.');
      }
    } else {
      this.leaderboard = {};
      console.log('No leaderboard found in localStorage.');
    }
  }

  saveLeaderboard(): void {
    localStorage.setItem('puzzle-leaderboard-v2', JSON.stringify(this.leaderboard));
    console.log('Leaderboard saved:', this.leaderboard);
  }

  checkAndUpdateRecords(): void {
    if (!this.leaderboard[this.size]) {
      this.leaderboard[this.size] = [];
    }

    const records = this.leaderboard[this.size];
    let playerRecord = records.find(r => r.playerName === this.playerName);
    
    if (!playerRecord) {
      playerRecord = { bestMoves: null, bestTime: null, playerName: this.playerName };
      records.push(playerRecord);
    }

    this.isNewRecord = { moves: false, time: false };

    // Check moves record
    if (playerRecord.bestMoves === null || this.moveCount < playerRecord.bestMoves) {
      playerRecord.bestMoves = this.moveCount;
      this.isNewRecord.moves = true;
    }

    // Check time record
    if (playerRecord.bestTime === null || this.elapsedMs < playerRecord.bestTime) {
      playerRecord.bestTime = this.elapsedMs;
      this.isNewRecord.time = true;
    }

    this.saveLeaderboard();
  }

  getCurrentRecord(): LeaderboardRecord | null {
    const records = this.leaderboard[this.size];
    return records?.find(r => r.playerName === this.playerName) || null;
  }

  getAllRecords(): LeaderboardRecord[] {
    return this.leaderboard[this.size] || [];
  }

  hasAnyRecords(): boolean {
    return Object.keys(this.leaderboard).some(size => {
      const records = this.leaderboard[parseInt(size)];
      return records && records.length > 0 && records.some(r => r.bestMoves !== null || r.bestTime !== null);
    });
  }

  updatePlayerName(name: string): void {
    const trimmed = name.trim();
    if (this.addingNewPlayer) {
      if (!trimmed) {
        // Optionally, show a warning or shake input
        return;
      }
      if (this.allPlayerNames.includes(trimmed)) {
        this.statusMessage = `Error: Player name '${trimmed}' already exists.`;
        this.ngZone.runOutsideAngular(() => {
          setTimeout(() => {
            this.ngZone.run(() => {
              this.statusMessage = '';
            });
          }, 2500);
        });
        return;
      }
      this.playerName = trimmed;
      this.allPlayerNames.push(this.playerName);
      this.allPlayerNames.sort((a, b) => a.localeCompare(b));
      localStorage.setItem('puzzle-player-name', this.playerName);
      localStorage.setItem('puzzle-all-players', JSON.stringify(this.allPlayerNames));
      this.statusMessage = `Now playing as ${this.playerName}`;
      this.saveLeaderboard();
      this.addingNewPlayer = false;
      this.editingPlayerName = false;
      return;
    }
    if (this.editingCurrentPlayer) {
      if (!trimmed) {
        // Optionally, show a warning or shake input
        return;
      }
      if (trimmed === this.playerName) {
        // No change, just exit edit mode (allowed)
        this.editingCurrentPlayer = false;
        this.editingPlayerName = false;
        return;
      }
      if (this.allPlayerNames.includes(trimmed)) {
        // Duplicate name, do not allow (unless it's the current name, which is handled above)
        if (trimmed !== this.playerName) {
          this.statusMessage = `Error: Player name '${trimmed}' already exists.`;
          this.ngZone.runOutsideAngular(() => {
            setTimeout(() => {
              this.ngZone.run(() => {
                this.statusMessage = '';
              });
            }, 2500);
          });
          return;
        }
      }
      // Update player name in the list
      const idx = this.allPlayerNames.indexOf(this.playerName);
      if (idx !== -1) {
        this.allPlayerNames[idx] = trimmed;
        this.allPlayerNames.sort((a, b) => a.localeCompare(b));
      }
      this.playerName = trimmed;
      localStorage.setItem('puzzle-player-name', this.playerName);
      localStorage.setItem('puzzle-all-players', JSON.stringify(this.allPlayerNames));
      this.statusMessage = `Player name updated to ${this.playerName}`;
      this.saveLeaderboard();
      this.editingCurrentPlayer = false;
      this.editingPlayerName = false;
      return;
    }
    if (trimmed === '') {
      this.addingNewPlayer = true;
      this.playerName = '';
      return;
    }
    if (trimmed && trimmed !== this.playerName) {
      this.playerName = trimmed;
      localStorage.setItem('puzzle-player-name', this.playerName);
      if (!this.allPlayerNames.includes(this.playerName)) {
        this.allPlayerNames.push(this.playerName);
        this.allPlayerNames.sort((a, b) => a.localeCompare(b));
        localStorage.setItem('puzzle-all-players', JSON.stringify(this.allPlayerNames));
      }
      this.statusMessage = `Now playing as ${this.playerName}`;
      this.saveLeaderboard();
    }
    this.editingPlayerName = false;
  }

  clearLeaderboard(): void {
    if (confirm('Are you sure you want to clear all leaderboard records?')) {
      this.leaderboard = {};
      this.saveLeaderboard();
      this.statusMessage = 'Leaderboard cleared';
    }
  }

  handleArrowKeyMovement(arrowKey: string): void {
    const emptyIdx = this.emptyIndex;
    const emptyRow = Math.floor(emptyIdx / this.size);
    const emptyCol = emptyIdx % this.size;
    
    let targetRow = emptyRow;
    let targetCol = emptyCol;
    
    // Determine which tile should move into the empty space
    switch (arrowKey) {
      case 'ArrowUp':
        // Move tile from below empty space up
        targetRow = emptyRow + 1;
        break;
      case 'ArrowDown':
        // Move tile from above empty space down  
        targetRow = emptyRow - 1;
        break;
      case 'ArrowLeft':
        // Move tile from right of empty space left
        targetCol = emptyCol + 1;
        break;
      case 'ArrowRight':
        // Move tile from left of empty space right
        targetCol = emptyCol - 1;
        break;
    }
    
    // Check if target position is valid
    if (targetRow >= 0 && targetRow < this.size && 
        targetCol >= 0 && targetCol < this.size) {
      const targetIdx = targetRow * this.size + targetCol;
      this.move(targetIdx);
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    const isSpace = event.code === 'Space' || event.key === ' ';
    
    // Handle Play Again when solved
    if (this.isSolved()) {
      if (key === 'p' || isSpace) {
        event.preventDefault();
        this.reset();
        this.statusMessage = 'New game started';
      }
      return;
    }
    
    // Handle arrow keys for tile movement
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      this.handleArrowKeyMovement(event.key);
      return;
    }
    
    if (isSpace) {
      if (this.hasStarted) {
        event.preventDefault();
        if (this.isRunning) {
          this.pause();
        } else if (this.isPaused()) {
          this.resume();
        }
      }
      return;
    }
    
    if (key === 'r') {
      // Resume if paused
      if (this.isPaused()) {
        event.preventDefault();
        this.resume();
      }
      return;
    }
    
    if (key === 's') {
      // Shuffle/Reset
      event.preventDefault();
      this.reset();
      this.statusMessage = 'New game shuffled';
      return;
    }
    
    if (key === 'e') {
      if (this.hasStarted) {
        event.preventDefault();
        this.end();
      }
    }
  }

  formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const millis = ms % 1000;
    return `${minutes.toString().padStart(2, '0')}:` +
           `${seconds.toString().padStart(2, '0')}:` +
           `${millis.toString().padStart(3, '0')}`;
  }

  removeCurrentPlayer(): void {
    if (this.allPlayerNames.length <= 1) {
      this.statusMessage = 'Error: At least one player must exist.';
      this.ngZone.runOutsideAngular(() => {
        setTimeout(() => {
          this.ngZone.run(() => {
            this.statusMessage = '';
          });
        }, 2500);
      });
      return;
    }
    const idx = this.allPlayerNames.indexOf(this.playerName);
    if (idx !== -1) {
      this.allPlayerNames.splice(idx, 1);
      localStorage.setItem('puzzle-all-players', JSON.stringify(this.allPlayerNames));
      // Remove player records from leaderboard
      Object.keys(this.leaderboard).forEach(size => {
        const records = this.leaderboard[parseInt(size)];
        if (records) {
          this.leaderboard[parseInt(size)] = records.filter((r: any) => r.playerName !== this.playerName);
        }
      });
      this.saveLeaderboard();
      // Switch to another player
      this.playerName = this.allPlayerNames[0];
      localStorage.setItem('puzzle-player-name', this.playerName);
      this.statusMessage = 'Player removed successfully.';
      this.editingCurrentPlayer = false;
      this.editingPlayerName = false;
      this.ngZone.runOutsideAngular(() => {
        setTimeout(() => {
          this.ngZone.run(() => {
            this.statusMessage = '';
          });
        }, 2500);
      });
    }
  }
}
