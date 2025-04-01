import { createClient } from "@supabase/supabase-js";
const supabaseUrl = "https://osbrknaujwvdtcuuzfdf.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zYnJrbmF1and2ZHRjdXV6ZmRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyOTM3OTUsImV4cCI6MjA1ODg2OTc5NX0.276ZKP9RJaQC03GzpY_kd0hE2_vG33wHgCDUtyQr84o";
export const supabase = createClient(supabaseUrl, supabaseKey);