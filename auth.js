/* BasinAgentic authentication: ClerkJS, Clerk Billing and Cloudflare Worker.
   This file has no report storage, no Supabase and no Stripe secret.
   Clerk's official browser SDK is loaded dynamically from your Clerk Frontend API. */
(function(){
'use strict';
const conf=window.BA_CONFIG||{};
const base=String(conf.WORKER_URL||'').replace(/\/$/,'');
const publishableKey=String(conf.CLERK_PUBLISHABLE_KEY||'');
const message='Clerk is not configured. Enter your publishable key in config.js and deploy the Cloudflare Worker.';
let clerk=null;
let initPromise=null;
function loadScript(src,attributes={}){
  return new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=src;script.async=true;script.crossOrigin='anonymous';
    Object.entries(attributes).forEach(([key,value])=>script.setAttribute(key,value));
    script.onload=resolve;script.onerror=()=>reject(Error('Could not load Clerk browser library.'));
    document.head.appendChild(script);
  });
}
async function init(){
 if(initPromise)return initPromise;
 initPromise=(async()=>{
  if(!/^pk_(test|live)_[A-Za-z0-9_$-]+$/.test(publishableKey)||!base.startsWith('https://'))throw Error(message);
  // Official ClerkJS CDN approach, derived from the publishable key.
  const fapi=atob(publishableKey.split('_')[2]).replace(/\$$/,'');
  if(!/^[a-z0-9.-]+$/i.test(fapi)||fapi.indexOf('.')<0)throw Error('Invalid Clerk frontend API domain.');
  await loadScript(`https://${fapi}/npm/@clerk/ui@1/dist/ui.browser.js`);
  await loadScript(`https://${fapi}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`, {'data-clerk-publishable-key':publishableKey});
  if(!window.Clerk)throw Error('Clerk SDK failed to initialize.');
  clerk=window.Clerk;
  await clerk.load({ui:{ClerkUI:window.__internal_ClerkUICtor}});
  return clerk;
 })();
 return initPromise;
}
async function getUser(){const c=await init();return c.user||null;}
async function token(){const c=await init();const val=await c.session?.getToken();if(!val)throw Error('Please sign in to continue.');return val;}
function loginRedirect(plan){const u=new URL('login.html',location.href);if(plan)u.searchParams.set('plan',plan);location.assign(u.toString());}
async function apiFetch(path,options={}){
 const sessionToken=await token();
 const url=new URL(path,base+'/');
 if(url.origin!==new URL(base).origin||!url.pathname.startsWith(new URL(base).pathname.replace(/\/$/,'')+'/'))throw Error('Invalid secure API destination.');
 const headers=new Headers(options.headers||{});headers.set('Authorization','Bearer '+sessionToken);
 return fetch(url,{...options,headers,credentials:'omit',cache:'no-store'});
}
async function apiJson(path,options={}){const response=await apiFetch(path,options);const body=await response.json().catch(()=>({}));if(!response.ok)throw Error(body.error||body.message||`HTTP ${response.status}`);return body;}
async function getMembership(){return apiJson('/me');}
async function requirePlan(service){
 const user=await getUser();if(!user){loginRedirect();return false;}
 const status=await getMembership();
 if(!status.active){location.assign('portal.html#plans');return false;}
 if(service==='swd'&&!['basin-intelligence','enterprise'].includes(status.plan)){
   location.assign('portal.html?upgrade=basin-intelligence#plans');return false;
 }
 return true;
}
async function startCheckout(plan){
 if(!['production-pro','basin-intelligence'].includes(plan))throw Error('Unknown subscription plan.');
 const u=new URL('portal.html',location.href);u.searchParams.set('plan',plan);u.hash='plans';location.assign(u.toString());
}
async function openBillingPortal(){const c=await init();if(!c.user)throw Error('Please sign in.');c.openUserProfile();}
window.BA_AUTH={init,getUser,token,apiFetch,apiJson,getMembership,requirePlan,startCheckout,openBillingPortal,loginRedirect,
 get client(){return clerk;},get ready(){return Boolean(clerk?.isSignedIn)} };
})();
