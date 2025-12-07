// lib/types.ts
// (這是我們共享的型別)
export type Position = "G" | "F" | "C";


export interface Player {
    id: number;
    name: string;
    team: string;
    position: Position;
    salary: number;
    PTS: number;
    REB: number;
    AST: number;
    STL: number;
    BLK: number;
    TURNOVER: number;
    THREE_made: number;
    
    image_url: string; 
  }
  
export interface GameSettings {
    id: number;
    weighted_formula: any; // MVP 階段，先用 any
    salary_cap: number;
    current_week: number;
  }
