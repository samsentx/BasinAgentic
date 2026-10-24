/* BasinAgentic shared browser authentication and secure API client.
   Supabase is only the identity provider; subscription authorization happens on the Worker. */
(function () {
  'use strict';
  const conf=window.BA_CONFIG||{};
  const ready=Boolean(window.supabase?.createClient && conf.SUPABASE_URL && !conf.SUPABASE_URL.includes('YOUR_PROJECT') && conf.SUPABASE_PUBLISHABLE_KEY && !conf.SUPABASE_PUBLISHABLE_KEY.startsWith('YOUR_') && conf.WORKER_URL);
  const client=ready?window.supabase.createClient(conf.SUPABASE_URL,conf.SUPABASE_PUBLISHABLE_KEY):null;
  const base=(conf.WORKER_URL||'').replace(/\/$/,'');
  const message='Billing is not configured yet. Set Supabase and Cloudflare Worker values in config.js.';
  function assertReady(){if(!client)throw Error(message);}
  function currentPage(){return location.pathname.split('/').pop()||'index.html';}
  function loginRedirect(plan){
    const args=new URLSearchParams();if(plan)args.set('plan',plan);
    args.set('from',currentPage());location.href='login.html?'+args.toString();
  }
  async function getUser(){assertReady();const {data,error}=await client.auth.getUser();if(error)throw error;return data?.user||null;}
  async function token(){assertReady();const {data,error}=await client.auth.getSession();if(error)throw error;const val=data?.session?.access_token;if(!val)throw Error('Please sign in to access the platform.');return val;}
  async function apiFetch(path,options={}){
    const accessToken=await token();
    const url=/^https:\/\//.test(path)?path:base+path;
    if(!url.startsWith(base+'/'))throw Error('Invalid secure API destination.');
    const headers=new Headers(options.headers||{});headers.set('Authorization','Bearer '+accessToken);
    const res=await fetch(url,{...options,headers,credentials:'omit',cache:'no-store'});
    return res;
  }
  async function apiJson(path,options={}){
    const res=await apiFetch(path,options);
    const body=await res.json().catch(()=>({}));
    if(!res.ok)throw Error(body.error||body.message||`Request failed (HTTP ${res.status})`);
    return body;
  }
  async function getMembership(){return await apiJson('/me');}
  async function requirePlan(service){
    assertReady();
    const user=await getUser();
    if(!user){loginRedirect();return false;}
    const sub=await getMembership();
    if(!sub.active){location.href='portal.html?subscribe=1';return false;}
    if(service==='swd'&&sub.plan!=='basin-intelligence'&&sub.plan!=='enterprise'){
      location.href='portal.html?upgrade=basin-intelligence';return false;
    }
    return true;
  }
  async function startCheckout(plan){
    if(!['production-pro','basin-intelligence'].includes(plan))throw Error('Invalid monthly plan');
    const data=await apiJson('/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({plan})});
    if(!data.url?.startsWith('https://checkout.stripe.com/'))throw Error('Stripe Checkout did not return a valid URL');
    location.assign(data.url);
  }
  async function openBillingPortal(){
    const data=await apiJson('/billing-portal',{method:'POST'});
    if(!data.url?.startsWith('https://billing.stripe.com/'))throw Error('Stripe Billing Portal did not return a valid URL');
    location.assign(data.url);
  }
  window.BA_AUTH={client,ready,message,getUser,token,apiFetch,apiJson,getMembership,requirePlan,startCheckout,openBillingPortal,loginRedirect};
})();
