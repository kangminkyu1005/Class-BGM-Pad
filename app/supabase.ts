import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://wrkoxpyckmloibhzknki.supabase.co";
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_FVdy6q7Pj9-PE5krKUVSZw_b1HPBQtu";

export const CLASS_BGM_TABLE = "class_bgm_buttons";
export const CLASS_BGM_BUCKET = "class-bgm-audio";

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
