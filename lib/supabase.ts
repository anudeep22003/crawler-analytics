import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// The browser SDK persists and refreshes sessions automatically.
export const supabase = url && key ? createClient(url, key) : null;
