// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

// 1. 取得變數
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 2. [關鍵]  runtime 檢查！
if (!supabaseUrl) {
  throw new Error("Supabase URL is missing. Please check your .env.local file.")
}
if (!supabaseAnonKey) {
  throw new Error("Supabase Anon Key is missing. Please check your .env.local file.")
}

// 3. 到了這裡，TypeScript 知道這兩個變數 100% 是 'string'
//    createClient() 函式現在會滿意了
export const supabase = createClient(supabaseUrl, supabaseAnonKey)