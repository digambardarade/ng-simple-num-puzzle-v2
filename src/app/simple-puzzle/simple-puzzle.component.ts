import { Component, OnInit, HostListener, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';

@Component({
  selector: 'app-simple-puzzle',
  templateUrl: './simple-puzzle.component.html',
  styleUrls: ['./simple-puzzle.component.scss']
})
export class SimplePuzzleComponent implements OnInit, AfterViewChecked {
  @ViewChild('playAgainBtn') playAgainBtn!: ElementRef<HTMLButtonElement>;
  
  size = 3; // default board size
  tiles: number[] = [];
  moveCount = 0;
  startTime: number | null = null;
  elapsedMs = 0;
  timerId: any = null;
  hasStarted = false;
  statusMessage = ''
  private wasSolved = false;

  ngOnInit(): void {
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
    }
  }

  isSolved(): boolean {
    for (let i = 0; i < this.tiles.length - 1; i++) {
      if (this.tiles[i] !== i + 1) return false;
    }
    return this.tiles[this.tiles.length - 1] === 0;
  }

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

  togglePause(): void {
    if (this.isRunning) {
      this.stopTimer();
      return;
    }
    // Only resume if a game has started previously and not solved
    if (this.startTime !== null && !this.isSolved()) {
      this.resumeTimer();
    }
  }

  get pauseLabel(): string {
    if (this.isRunning) return 'Pause';
    return this.startTime !== null ? 'Resume' : 'Pause';
  }

  end(): void {
    // End should reset to a fresh game: zero moves, zero timer, new shuffle
    this.reset();
    this.statusMessage = 'Game ended. New game ready';
  }

  toggleStartPauseResume(): void {
    // Remove start behavior: only Pause/Resume
    if (this.isRunning) {
      this.stopTimer();
      this.statusMessage = 'Game paused';
      return;
    }
    if (this.hasStarted && this.startTime !== null && !this.isSolved()) {
      this.resumeTimer();
      this.statusMessage = 'Game resumed';
    }
  }

  get pauseResumeLabel(): string {
    return this.isRunning ? 'Pause' : 'Resume';
  }

  isPaused(): boolean {
    return this.hasStarted && !this.isRunning && this.startTime !== null && !this.isSolved();
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
        this.toggleStartPauseResume();
      }
      return;
    }
    
    if (key === 'r') {
      // Resume if paused
      if (this.isPaused()) {
        event.preventDefault();
        this.toggleStartPauseResume();
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
}
