/* Vertical calendar paging. Meals change only through explicit actions. */
(function(){
'use strict';
function pageIntent(dx,dy,elapsed,height){
 if(Math.abs(dy)<Math.abs(dx)*1.25)return 0;
 const distance=Math.abs(dy),threshold=Math.max(48,height*.22);
 return distance>=threshold||(distance>=36&&elapsed>0&&distance/elapsed>.5)?(dy<0?1:-1):0;
}
if(typeof module!=='undefined')module.exports={pageIntent};
if(typeof document==='undefined')return;
let gesture=null,sliding=null,suppressUntil=0,wheelAmount=0,wheelTimer,wheelReady=true;
const now=()=>performance.now();
const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function scene(direction){
 const viewport=document.querySelector('.schedule-viewport'),stack=viewport?.querySelector('.schedule-stack');
 if(!stack)return null;
 const height=viewport.clientHeight,adjacent=document.createElement('div');
 adjacent.className='schedule-stack';adjacent.innerHTML=scheduleCards(week+direction);
 adjacent.setAttribute('aria-hidden','true');adjacent.inert=true;viewport.appendChild(adjacent);
 const s={viewport,stack,adjacent,height,offset:direction*(height+12),direction};
 position(s,0);stack.getBoundingClientRect();return s;
}
function position(s,dy){s.stack.style.transform=`translateY(${dy}px)`;s.adjacent.style.transform=`translateY(${dy+s.offset}px)`;}
function settle(s,commit){
 sliding=s;
 const duration=reduced()?0:300;
 s.stack.style.transition=s.adjacent.style.transition=`transform ${duration}ms cubic-bezier(.22,.8,.2,1)`;
 position(s,commit?-s.offset:0);
 let complete=false;
 const finish=()=>{if(complete)return;complete=true;clearTimeout(timer);s.stack.removeEventListener('transitionend',onEnd);s.adjacent.remove();s.stack.style.transition='';s.stack.style.transform='';if(sliding===s)sliding=null;if(commit&&s.viewport.isConnected){const focused=s.viewport===document.activeElement;week+=s.direction;render();if(focused)document.querySelector('.schedule-viewport')?.focus({preventScroll:true});}};
 const onEnd=e=>{if(e.target===s.stack&&e.propertyName==='transform')finish();};
 s.stack.addEventListener('transitionend',onEnd);
 const timer=setTimeout(finish,duration+60);
}
function page(direction){if(sliding||gesture)return;const s=scene(direction);if(s){sliding=s;requestAnimationFrame(()=>{if(s.viewport.isConnected)settle(s,true);else sliding=null;});}}
document.addEventListener('pointerdown',e=>{
 if(sliding||!e.isPrimary||e.pointerType==='mouse'||e.clientX<24||e.clientX>innerWidth-24)return;
 const sheet=e.target.closest('.dialog-top'),viewport=e.target.closest('.schedule-viewport');
 if(!sheet&&!viewport)return;
 if(sheet&&e.target.closest('button,input,a'))return;
 gesture={id:e.pointerId,x:e.clientX,y:e.clientY,time:now(),sheet:!!sheet,viewport,scene:null,lastY:0};
});
document.addEventListener('pointermove',e=>{
 const g=gesture;if(!g||g.id!==e.pointerId||g.sheet)return;
 const dx=e.clientX-g.x,dy=e.clientY-g.y;
 if(!g.scene){if(Math.max(Math.abs(dx),Math.abs(dy))<8)return;if(Math.abs(dx)>Math.abs(dy)){gesture=null;return;}g.scene=scene(dy<0?1:-1);if(!g.scene){gesture=null;return;}}
 // Permit reversing a drag without rebuilding the adjacent page mid-gesture.
 const signed=dy*g.scene.direction;
 g.lastY=signed>0?dy*.18:Math.sign(dy)*Math.min(Math.abs(dy),g.scene.height*1.1);
 position(g.scene,g.lastY);suppressUntil=now()+400;
});
function end(e,cancelled=false){
 const g=gesture;if(!g||e.pointerId!==g.id)return;gesture=null;
 const dx=e.clientX-g.x,dy=e.clientY-g.y,elapsed=now()-g.time;
 if(g.sheet){if(!cancelled&&dy>75&&dy>Math.abs(dx)*1.7&&elapsed<700){document.querySelector('#close-dialog').click();suppressUntil=now()+400;}return;}
 if(g.scene){const direction=pageIntent(dx,dy,elapsed,g.scene.height);settle(g.scene,!cancelled&&direction===g.scene.direction);suppressUntil=now()+400;}
}
document.addEventListener('pointerup',e=>end(e));
document.addEventListener('pointercancel',e=>end(e,true));
document.addEventListener('click',e=>{
 if(e.isTrusted&&now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();return;}
 const button=e.target.closest('[data-action="week-next"],[data-action="week-prev"]');
 if(button&&document.querySelector('.schedule-viewport')){e.preventDefault();e.stopImmediatePropagation();page(button.dataset.action==='week-next'?1:-1);}
},true);
document.addEventListener('wheel',e=>{
 if(!e.target.closest('.schedule-viewport')||e.ctrlKey||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;
 e.preventDefault();clearTimeout(wheelTimer);wheelTimer=setTimeout(()=>{wheelAmount=0;wheelReady=true;},180);
 if(!wheelReady||sliding||gesture)return;
 wheelAmount+=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1);
 if(Math.abs(wheelAmount)>65){wheelReady=false;page(wheelAmount>0?1:-1);wheelAmount=0;}
},{passive:false});
document.addEventListener('keydown',e=>{
 if(!e.target.matches('.schedule-viewport')||e.altKey||e.metaKey||e.ctrlKey)return;
 const direction=({PageDown:1,ArrowDown:1,PageUp:-1,ArrowUp:-1})[e.key];
 if(direction){e.preventDefault();page(direction);}
});
let shownDay=new Date().toDateString();
document.addEventListener('visibilitychange',()=>{if(document.hidden)return;const nextDay=new Date().toDateString();if(nextDay!==shownDay){shownDay=nextDay;try{ensure();render();}catch(error){toast(error.message);}}});
})();
