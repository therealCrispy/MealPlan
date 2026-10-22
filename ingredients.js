const LOCAL_KW=['cilantro','parsley','dill','thyme','rosemary','chive','ginger','avocado','lemon','lime','asparagus','green bean','green onion','scallion','cucumber','celery'];
function isLocal(s){const l=s.toLowerCase();return LOCAL_KW.some(k=>l.includes(k))}
// Canned & Pantry checked FIRST so "chicken broth" doesn't land in Proteins,
// "rice vinegar" doesn't land in Grains, "garlic powder" doesn't land in Produce
const SAMS_CATS={
  'Canned & Pantry':['broth','bean','tomato','cream of','marinara','cornstarch','vinegar','oil','mustard','worcestershire','bbq','oyster sauce','brown sugar','chili powder','paprika','cumin','oregano','seasoning','garlic powder','onion powder','cayenne','cinnamon','chipotle'],
  'Proteins':['chicken thigh','chicken breast','ground beef','ground turkey','pork shoulder','pork loin','pork tenderloin','salmon','cod','tuna','shrimp','sausage','chuck roast','albacore'],
  'Dairy & Eggs':['egg','butter','sour cream','heavy cream','whole milk','cheese','parmesan','feta','mozzarella','cheddar'],
  'Grains & Pasta':['brown rice','white rice','egg noodle','spaghetti','linguine','penne','breadcrumb','panko'],
  'Oils & Condiments':['honey','soy sauce','sesame oil','cooking oil','olive oil','rice vinegar','bbq sauce','dijon'],
  'Produce':['potato','broccoli','carrot','spinach','orange'],
  'Other':[]
};
const LOCAL_CATS={
  'Fresh Herbs':['cilantro','parsley','dill','thyme','rosemary','chive'],
  'Citrus':['lemon','lime'],
  'Fresh Produce':['asparagus','green bean','green onion','scallion','cucumber','celery','ginger','avocado'],
  'Other':[]
};
function catIngredient(s,storeType){
  const l=s.toLowerCase();
  const cats=storeType==='local'?LOCAL_CATS:SAMS_CATS;
  for(const [cat,kws] of Object.entries(cats)){
    if(cat==='Other')continue;
    if(kws.some(k=>l.includes(k)))return cat;
  }
  return'Other';
}
function normQty(s){
  return s.replace(/½/g,'.5').replace(/¼/g,'.25').replace(/¾/g,'.75')
    .replace(/⅓/g,'.333').replace(/⅔/g,'.667').replace(/⅛/g,'.125');
}
const UNIT_NORM={'lbs':'lbs','lb':'lbs','oz':'oz','tbsp':'tbsp','tsp':'tsp',
  'cups':'cup','cup':'cup','cans':'can','can':'can','cloves':'clove','clove':'clove',
  'bunches':'bunch','bunch':'bunch','stalks':'stalk','stalk':'stalk',
  'jars':'jar','jar':'jar','bags':'bag','bag':'bag','pkg':'pkg'};
function parseIng(raw){
  const s=normQty(raw.trim());
  const m=s.match(/^(\d*\.?\d+)?\s*(lbs?|oz|cups?|tbsp|tsp|cans?|cloves?|bunches?|stalks?|jars?|bags?|pkg)?\s+(.+)$/i);
  if(m){const u=(m[2]||'').toLowerCase();return{qty:parseFloat(m[1]||'1'),unit:UNIT_NORM[u]||u,name:m[3].trim()}}
  return{qty:1,unit:'',name:raw.trim()};
}
const NO_PLURAL=new Set(['tbsp','tsp','oz','lbs']);
function fmtUnit(unit,qty){
  if(!unit)return'';
  if(NO_PLURAL.has(unit))return unit;
  if(qty<=1)return unit;
  if(unit==='bunch')return'bunches';
  return unit+'s';
}
function normName(n){
  return n.toLowerCase()
    .replace(/\bboneless\s+skinless\b/g,'')
    .replace(/\b(?:fresh|frozen|dry|dried|minced|grated|roughly\s+chopped|chopped|sliced|diced|peeled|trimmed|shredded|crushed|cooked|thawed|day-old|long-grain)\b/g,'')
    .replace(/\b(?:93\/7|80\/20)\b/g,'')
    .replace(/\(.*?\)/g,'').replace(/,.*$/,'').replace(/\bor\b.*$/,'')
    .replace(/\s+/g,' ').trim();
}

if(typeof module!=="undefined")module.exports={isLocal,catIngredient,normName};
