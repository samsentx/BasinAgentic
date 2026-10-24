/* PUBLIC configuration only. Never put a Stripe secret key or Supabase service role key here.
   Replace the placeholders after creating your Supabase project and Cloudflare Worker. */
window.BA_CONFIG = Object.freeze({
  SUPABASE_URL: 'https://YOUR_PROJECT.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY',
  WORKER_URL: 'https://billing-api.basinagentic.com'
});
