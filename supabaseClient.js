const SUPABASE_URL = "https://fpqnzqrdyxmhptosplos.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwcW56cXJkeXhtaHB0b3NwbG9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjMyNDYsImV4cCI6MjA2MzMzOTI0Nn0.tcz7BdDovKPS-KoPk_LxRJW8ZfJpgjN8fKQ7h6NdR6c";

// ⚠️ window.supabase debe existir
if (!window.supabase) {
  console.error("❌ supabase-js no cargado");
  throw new Error("supabase-js no cargado");
}

window.__supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

console.log("✅ Supabase inicializado");