/* Gesture scenes are disposable; navigation invalidates every pending completion. */
(function(){
'use strict';
function pageIntent(dx,dy,elapsed,height){if(Math.abs(dy)<Math.abs(dx)*1.25)return 0;const n=Math.abs(dy);return n>=Math.max(48,height*.22)||(n>=36&&elapsed>0&&n/elapsed>.5)?(dy<0?1:-1):0;}
function tabIntent(dx,dy,elapsed,width,index,count=5){if(Math.abs(dx)<Math.abs(dy)*1.4)return 0;const n=Math.abs(dx),d=dx<0?1:-1;if(n<Math.max(58,width*.2)&&!(n>=38&&elapsed>0&&n/elapsed>.5))return 0;return index+d>=0&&index+d<count?d:0;}
function sheetIntent(dy,elapsed,height){return dy>Math.max(100,height*.22)||(dy>50&&elapsed>0&&dy/elapsed>.6);}
if(typeof module!=='undefined')module.exports={pageIntent,tabIntent,sheetIntent};
if(typeof document==='undefined')return;
let gesture=null,motion=null,generation=0,suppressUntil=0,wheelAmount=0,wheelTimer,wheelReady=true;
const now=()=>performance.now(),reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function clearTargets(){document.querySelectorAll('.swipe-target').forEach(b=>b.classList.remove('swipe-target'));}
function reset(){generation++;const m=motion;motion=null;if(m){clearTimeout(m.timer);m.cleanup();}const g=gesture;gesture=null;if(g?.scene&&g.scene!==m)g.scene.cleanup();clearTargets();}
// Timer and transition callbacks can never commit after navigation or a new render.
function animate(s,commit,update,duration=260){
 motion=s;const token=generation;const ms=reduced()?0:duration;s.nodes.forEach(n=>n.style.transition=`transform ${ms}ms cubic-bezier(.22,.8,.2,1)`);update();
 s.timer=setTimeout(()=>{if(token!==generation||motion!==s)return;motion=null;s.cleanup();if(commit)commit();},ms+30);
}
function weekScene(direction){const viewport=document.querySelector('.schedule-viewport'),stack=viewport?.querySelector('.schedule-stack');if(!stack)return null;const height=viewport.clientHeight,adjacent=document.createElement('div');adjacent.className='schedule-stack';adjacent.innerHTML=scheduleCards(week+direction);adjacent.setAttribute('aria-hidden','true');adjacent.inert=true;viewport.appendChild(adjacent);const s={nodes:[stack,adjacent],viewport,height,direction,offset:direction*(height+12),move(dy){stack.style.transform=`translateY(${dy}px)`;adjacent.style.transform=`translateY(${dy+s.offset}px)`;},cleanup(){adjacent.remove();stack.style.transform='';stack.style.transition='';}};s.move(0);stack.getBoundingClientRect();return s;}
function finishWeek(s,commit){const originTab=tab,originWeek=week;animate(s,commit?()=>{if(tab===originTab&&week===originWeek&&s.viewport.isConnected){const focus=document.activeElement===s.viewport;week+=s.direction;render();if(focus)document.querySelector('.schedule-viewport')?.focus({preventScroll:true});}}:null,()=>s.move(commit?-s.offset:0));}
function page(direction){if(motion||gesture)return;const s=weekScene(direction);if(s)finishWeek(s,true);}
function tabScene(direction){
 const index=TAB_ORDER.indexOf(tab),next=TAB_ORDER[index+direction],view=document.querySelector('#view');if(!next||!view)return null;
 const rect=view.getBoundingClientRect(),nav=document.querySelector('aside'),navRect=nav?.getBoundingClientRect(),header=document.querySelector('main header'),headerRect=header?.getBoundingClientRect();
 const top=Math.max(0,headerRect?.bottom>0?headerRect.bottom+12:0,rect.top),bottom=navRect&&navRect.top>0&&navRect.width>innerWidth*.8?navRect.top:innerHeight,height=Math.max(100,bottom-top);
 const stage=document.createElement('div');stage.className='tab-stage';stage.style.cssText=`left:${rect.left}px;top:${top}px;width:${rect.width}px;height:${height}px`;stage.inert=true;stage.setAttribute('aria-hidden','true');
 const current=document.createElement('div'),incoming=document.createElement('div');current.className=incoming.className='tab-slide-page';
 function fill(page,html,offset,isPlan){const body=document.createElement('div');body.className='tab-slide-body'+(isPlan?' tab-slide-plan':'');body.innerHTML=html;body.style.top=offset+'px';if(isPlan)body.style.height=(isPlan&&tab==='plan'?rect.height:height)+'px';body.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));page.appendChild(body);}
 fill(current,view.innerHTML,rect.top-top,tab==='plan');fill(incoming,tabMarkup(next),-(tabPositions[next]||0),next==='plan');stage.append(current,incoming);document.body.appendChild(stage);view.style.opacity='0';
 const origin=tab,width=rect.width,s={nodes:[current,incoming],next,origin,direction,width,move(dx){current.style.transform=`translateX(${dx}px)`;incoming.style.transform=`translateX(${dx+direction*width}px)`;},cleanup(){stage.remove();view.style.opacity='';view.style.transform='';view.style.transition='';clearTargets();}};s.move(0);stage.getBoundingClientRect();return s;
}
function finishTab(s,commit){animate(s,commit?()=>{if(tab===s.origin)switchTab(s.next);}:null,()=>s.move(commit?-s.direction*s.width:0),220);}
function sheetScene(dialog){const s={nodes:[dialog],height:dialog.getBoundingClientRect().height,move(dy){dialog.style.transform=`translateY(${Math.max(0,dy)}px)`;},cleanup(){dialog.style.transform='';dialog.style.transition='';dialog.classList.remove('sheet-dragging');}};dialog.classList.add('sheet-dragging');return s;}
function finishSheet(s,commit){animate(s,commit?()=>close():null,()=>s.move(commit?s.height+30:0),220);}
function start(e){
 if(e.pointerType==='mouse'||e.isPrimary===false||e.clientX<24||e.clientX>innerWidth-24)return;
 if(gesture)return;
 const dialog=document.querySelector('#dialog'),inDialog=dialog?.open&&e.target.closest('#dialog');
 if(e.target.closest('input,textarea,select,[contenteditable],form'))return;
 if(inDialog){if(e.target.closest('button,a')||dialog.scrollTop>0)return;if(motion)reset();gesture={id:e.pointerId,x:e.clientX,y:e.clientY,time:now(),sheet:dialog,axis:null,scene:null};return;}
 if(dialog?.open)return;
 const viewport=e.target.closest('.schedule-viewport'),view=e.target.closest('#view');if(!viewport&&!view)return;
 // A new interaction immediately cancels an unfinished animation.
 if(motion)reset();gesture={id:e.pointerId,x:e.clientX,y:e.clientY,time:now(),viewport,axis:null,scene:null};
}
function move(e){const g=gesture;if(!g||g.id!==e.pointerId)return;const dx=e.clientX-g.x,dy=e.clientY-g.y;
 if(g.sheet){if(!g.axis){if(Math.max(Math.abs(dx),Math.abs(dy))<9)return;if(dy<=0||Math.abs(dx)>Math.abs(dy)||g.sheet.scrollTop>0){gesture=null;return;}g.axis='sheet';g.scene=sheetScene(g.sheet);}g.scene.move(dy);suppressUntil=now()+220;return;}
 if(!g.axis){if(Math.max(Math.abs(dx),Math.abs(dy))<10)return;if(Math.abs(dx)>Math.abs(dy)*1.4)g.axis='x';else if(Math.abs(dy)>Math.abs(dx)*1.25){if(!g.viewport){gesture=null;return;}g.axis='y';}else return;}
 if(g.axis==='x'){const direction=dx<0?1:-1;if(g.scene&&direction!==g.scene.direction){g.scene.cleanup();g.scene=null;}if(!g.scene)g.scene=tabScene(direction);if(g.scene){g.scene.move(Math.sign(dx)*Math.min(Math.abs(dx),g.scene.width));document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('swipe-target',b.dataset.tab===g.scene.next));}suppressUntil=now()+220;return;}
 if(!g.scene)g.scene=weekScene(dy<0?1:-1);if(g.scene)g.scene.move(dy*g.scene.direction>0?dy*.18:Math.sign(dy)*Math.min(Math.abs(dy),g.scene.height*1.1));suppressUntil=now()+220;
}
function end(e,cancelled=false){const g=gesture;if(!g||e.pointerId!==g.id)return;gesture=null;const dx=e.clientX-g.x,dy=e.clientY-g.y,elapsed=now()-g.time;if(!g.scene)return;
 if(g.sheet)finishSheet(g.scene,!cancelled&&sheetIntent(dy,elapsed,g.scene.height));
 else if(g.axis==='x')finishTab(g.scene,!cancelled&&tabIntent(dx,dy,elapsed,g.scene.width,TAB_ORDER.indexOf(tab),TAB_ORDER.length)===g.scene.direction);
 else finishWeek(g.scene,!cancelled&&pageIntent(dx,dy,elapsed,g.scene.height)===g.scene.direction);
 suppressUntil=now()+220;
}
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#dialog'))start(e);});
document.addEventListener('pointermove',e=>{if(!gesture?.sheet)move(e);});
document.addEventListener('pointerup',e=>{if(!gesture?.sheet)end(e);});
document.addEventListener('pointercancel',e=>{if(!gesture?.sheet)end(e,true);});
// Non-passive touch handling lets downward sheet drags coexist with native upward
// content scrolling. Prevent default only after a downward drag has locked.
function touchEvent(e){const t=e.touches[0]||e.changedTouches[0];return {target:e.target,pointerId:'sheet-touch',pointerType:'touch',clientX:t?.clientX||0,clientY:t?.clientY||0};}
document.addEventListener('touchstart',e=>{if(e.touches.length!==1){reset();return;}if(e.target.closest('#dialog'))start(touchEvent(e));},{passive:true});
document.addEventListener('touchmove',e=>{if(!gesture?.sheet)return;move(touchEvent(e));if(gesture?.axis==='sheet'&&e.cancelable)e.preventDefault();},{passive:false});
document.addEventListener('touchend',e=>{if(gesture?.sheet)end(touchEvent(e));},{passive:true});
document.addEventListener('touchcancel',e=>{if(gesture?.sheet)end(touchEvent(e),true);},{passive:true});
document.addEventListener('click',e=>{
 // Navigation is never swallowed by the post-drag ghost-click guard.
 if(e.target.closest('[data-tab]')){reset();suppressUntil=0;return;}
 if(e.isTrusted&&now()<suppressUntil&&e.target.closest('#view,#dialog')){e.preventDefault();e.stopImmediatePropagation();return;}
 const b=e.target.closest('[data-action="week-next"],[data-action="week-prev"]');if(b&&document.querySelector('.schedule-viewport')){e.preventDefault();e.stopImmediatePropagation();reset();page(b.dataset.action==='week-next'?1:-1);}
},true);
document.addEventListener('mealplan:before-render',reset);
document.addEventListener('mealplan:sheet-change',reset);
window.addEventListener('blur',reset);
window.addEventListener('resize',reset);
document.addEventListener('wheel',e=>{if(!e.target.closest('.schedule-viewport')||e.ctrlKey||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;e.preventDefault();clearTimeout(wheelTimer);wheelTimer=setTimeout(()=>{wheelAmount=0;wheelReady=true;},180);if(!wheelReady||motion||gesture)return;wheelAmount+=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1);if(Math.abs(wheelAmount)>65){wheelReady=false;page(wheelAmount>0?1:-1);wheelAmount=0;}},{passive:false});
document.addEventListener('keydown',e=>{if(!e.target.matches('.schedule-viewport')||e.altKey||e.metaKey||e.ctrlKey)return;const d=({PageDown:1,ArrowDown:1,PageUp:-1,ArrowUp:-1})[e.key];if(d){e.preventDefault();reset();page(d);}});
let shownDay=new Date().toDateString();document.addEventListener('visibilitychange',()=>{reset();if(document.hidden)return;const next=new Date().toDateString();if(next!==shownDay){shownDay=next;try{ensure();render();}catch(error){toast(error.message);}}});
})();
