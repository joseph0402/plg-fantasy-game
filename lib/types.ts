// lib/types.ts
// (這是我們共享的型別)

export interface Player {
    id: number;
    name: string;
    team: string;
    position: string;
    salary: number;
  }
  
  export interface GameSettings {
    id: number;
    weighted_formula: any; // MVP 階段，先用 any
    salary_cap: number;
    current_week: number;
  }