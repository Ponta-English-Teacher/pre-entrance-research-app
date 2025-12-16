import { createClient } from "@supabase/supabase-js";

// For now, use the hard-coded URL and anon key you confirmed earlier.
// (We can move these into .env later, but first we just want a stable app.)
const supabaseUrl = "https://qqygfmynsazpykruwtdf.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxeWdmbXluc2F6cHlrcnV3dGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1ODMxNzIsImV4cCI6MjA4MTE1OTE3Mn0.bz4dJ4RMmKHX6jeuYDcgAyspVdnd3jKlcJ8M341CGrM";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function insertTopic(topicData) {
  const { data, error } = await supabase.from("topics").insert(topicData);

  if (error) {
    console.error("Insert topic error:", error);
    return { error };
  }

  return { data };
}
export async function updateStage3Data(topicId, stage3Data) {
  const { data, error } = await supabase
    .from("topics")
    .update({ stage3_data: stage3Data })
    .eq("id", topicId)
    .select();

  return { data, error };
}