(function(root){
'use strict';
const D=86400000;
const date=s=>new Date(s+'T12:00:00');
const key=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const add=(s,n)=>{const d=date(s);d.setDate(d.getDate()+n);return key(d)};
const diff=(a,b)=>Math.round((date(a)-date(b))/D);
const fractions={'½':.5,'¼':.25,'¾':.75,'⅓':1/3,'⅔':2/3,'⅛':.125,'⅜':.375,'⅝':.625,'⅞':.875};
function ingredient(raw){
 let s=raw.trim().replace(/(\d*)\s*([½¼¾⅓⅔⅛⅜⅝⅞])/g,(_,n,f)=>String(Number(n||0)+fractions[f]));
 s=s.replace(/^(\d+)\s+(\d+)\/(\d+)/,(_,a,b,c)=>String(+a+b/c)).replace(/^(\d+)\/(\d+)/,(_,a,b)=>String(a/b));
 const m=s.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);let qty=m?+m[1]:1,rest=m?m[2]:s;
 const u=rest.match(/^(lbs?|pounds?|oz|ounces?|cups?|tbsp|tablespoons?|tsp|teaspoons?|cans?|cloves?|bunches?|stalks?|jars?|bags?|pkg)\b\s*/i);
 let unit=u?u[1].toLowerCase():'each';rest=u?rest.slice(u[0].length):rest;
 const units={lb:['oz',16],lbs:['oz',16],pound:['oz',16],pounds:['oz',16],ounce:['oz',1],ounces:['oz',1],cup:['tsp',48],cups:['tsp',48],tbsp:['tsp',3],tablespoon:['tsp',3],tablespoons:['tsp',3],teaspoon:['tsp',1],teaspoons:['tsp',1]};
 if(units[unit]){qty*=units[unit][1];unit=units[unit][0]}else unit=({cans:'can',cloves:'clove',bunches:'bunch',stalks:'stalk',jars:'jar',bags:'bag'})[unit]||unit;
 const name=rest.toLowerCase().replace(/\bboneless\s+skinless\b/g,'').replace(/\b(fresh|frozen|dry|dried|minced|grated|chopped|sliced|diced|peeled|trimmed|shredded|cooked|thawed|long-grain)\b/g,'').replace(/,.*$/,'').replace(/\s+/g,' ').trim();
 return {key:name+'|'+unit,name,unit,qty,raw};
}
function amounts(recipe,servings=4){const out={};for(const raw of recipe.ingredients){const i=ingredient(raw);i.qty*=servings/(recipe.servings||4);if(out[i.key])out[i.key].qty+=i.qty;else out[i.key]=i;}return out;}
function traits(r){const s=(r.name+' '+r.ingredients.join(' ')).toLowerCase();return {protein:(s.match(/chicken|turkey|beef|pork|salmon|shrimp|cod|tuna|sausage|egg/)||['vegetable'])[0],style:(r.name.toLowerCase().match(/taco|teriyaki|honey garlic|sesame ginger|soup|stew|chili|pasta|bowl|skillet|sheet pan/)||[r.method])[0]};}
function hash(s){let n=2166136261;for(const c of s)n=Math.imul(n^c.charCodeAt(0),16777619);return (n>>>0)/4294967296;}
function generate(state,recipes,start,days=14){
 const ids=Object.keys(recipes).filter(id=>!state.muted.includes(id));if(!ids.length)throw Error('Enable at least one recipe before planning.');
 for(let n=0;n<days;n++){const day=add(start,n);if(state.plan[day])continue;
 const history=Object.entries(state.plan).filter(([d,e])=>d<day&&!e.skipped&&recipes[e.id]).sort(([a],[b])=>b.localeCompare(a));
 const recent=new Set(history.filter(([d])=>diff(day,d)<14).map(([,e])=>e.id));
 let candidates=ids.filter(id=>!recent.has(id));if(!candidates.length)candidates=ids;
 const prev=history.slice(0,3).map(([,e])=>traits(recipes[e.id]));
 candidates.sort((a,b)=>score(b)-score(a));
 function score(id){const t=traits(recipes[id]);const last=history.find(([,e])=>e.id===id);const age=last?Math.min(90,diff(day,last[0])):100;const wd=date(day).getDay();return age*4-prev.reduce((v,p,i)=>v+(p.protein===t.protein?35/(i+1):0)+(p.style===t.style?25/(i+1):0),0)-(recipes[id].method==='crockpot'&&wd!==0&&wd!==6?50:0)+hash(day+id)*24;}
 state.plan[day]={id:candidates[0],cooked:false,servings:4};
 }return state;
}
function requirements(state,recipes,start,end,exclude){const out={};function include(r,servings){for(const [k,i] of Object.entries(amounts(r,servings))){if(out[k])out[k].qty+=i.qty;else out[k]={...i};}}
 for(const [d,e] of Object.entries(state.plan)){if(d<start||d>end||d===exclude||e.cooked||e.skipped||!recipes[e.id])continue;include(recipes[e.id],e.servings||4);}
 for(const [d,e] of Object.entries(state.batches||{})){if(d<start||d>end||e.cooked||!recipes[e.id])continue;include(recipes[e.id],e.days*2);}return out;}
function missing(state,recipes,id,day){const days=Object.keys(state.plan).filter(d=>d>=day);const end=days.sort().at(-1)||day;const reserved=requirements(state,recipes,day,end,day);
 // Reserve earlier uncooked dinners too: they may have been delayed.
 const earlier=requirements(state,recipes,'1900-01-01',add(day,-1));for(const[k,i]of Object.entries(earlier)){if(reserved[k])reserved[k].qty+=i.qty;else reserved[k]=i;}
 return Object.values(amounts(recipes[id])).map(i=>({...i,qty:Math.max(0,i.qty-Math.max(0,(state.stock[i.key]?.qty||0)-(reserved[i.key]?.qty||0)))})).filter(i=>i.qty>.001);
}
function cook(state,recipes,day,batch=false){const e=(batch?state.batches:state.plan)[day];if(!e||e.cooked||e.skipped)return;const used=amounts(recipes[e.id],batch?e.days*2:e.servings||4);e.consumed={};for(const[k,i]of Object.entries(used)){const available=state.stock[k]?.qty||0;e.consumed[k]=Math.min(available,i.qty);if(state.stock[k])state.stock[k].qty=Math.max(0,available-i.qty);}e.cooked=true;}
function uncook(state,day,batch=false){const e=(batch?state.batches:state.plan)[day];if(!e?.cooked)return;for(const[k,n]of Object.entries(e.consumed||{})){if(state.stock[k])state.stock[k].qty+=n;}e.cooked=false;delete e.consumed;}
function lunch(state,day){for(const[d,b]of Object.entries(state.batches||{}).sort(([a],[b])=>b.localeCompare(a))){if(day>=d&&day<add(d,b.days))return {id:b.id,batch:true,ready:b.cooked};}const e=state.plan[add(day,-1)];return e&&!e.skipped?{id:e.id,ready:e.cooked,batch:false}:null;}
const api={key,date,add,diff,ingredient,amounts,traits,generate,requirements,missing,cook,uncook,lunch};if(typeof module!=='undefined')module.exports=api;else root.Engine=api;
})(typeof window==='undefined'?globalThis:window);

