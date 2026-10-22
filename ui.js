/* Progressive touch enhancements. All gestures also have visible buttons. */
(function(root){
'use strict';
function swipeDirection(dx,dy,elapsed){
  if(elapsed>700||Math.abs(dx)<64||Math.abs(dx)<Math.abs(dy)*1.7)return 0;
  return dx<0?1:-1;
}
if(typeof module!=='undefined')module.exports={swipeDirection};
if(typeof document==='undefined')return;
let gesture=null,suppressUntil=0;
const interactive='button,a,input,textarea,select,label,[contenteditable]';
document.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='touch'||!e.isPrimary||e.target.closest(interactive))return;
  // Leave the screen edges to browser back/forward gestures.
  if(e.clientX<28||e.clientX>innerWidth-28)return;
  const sheet=e.target.closest('.dialog-top'),week=e.target.closest('.week-list');
  if(!sheet&&!week)return;
  gesture={id:e.pointerId,x:e.clientX,y:e.clientY,time:performance.now(),sheet:!!sheet};
});
document.addEventListener('pointercancel',()=>{gesture=null;});
document.addEventListener('pointerup',e=>{
  const g=gesture;gesture=null;if(!g||e.pointerId!==g.id)return;
  const dx=e.clientX-g.x,dy=e.clientY-g.y,elapsed=performance.now()-g.time;
  if(g.sheet){if(dy>75&&dy>Math.abs(dx)*1.7&&elapsed<700){document.querySelector('#close-dialog').click();suppressUntil=performance.now()+350;}return;}
  const direction=swipeDirection(dx,dy,elapsed);
  if(direction){const button=document.querySelector(`[data-action="week-${direction>0?'next':'prev'}"]`);if(button){button.click();suppressUntil=performance.now()+350;}}
});
document.addEventListener('click',e=>{if(e.isTrusted&&performance.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
// A live clock refresh keeps the page accurate after a phone has slept overnight.
let shownDay=new Date().toDateString();
document.addEventListener('visibilitychange',()=>{
  if(document.hidden)return;
  const nextDay=new Date().toDateString();
  if(nextDay!==shownDay){shownDay=nextDay;try{ensure();render();}catch(error){toast(error.message);}}
});
})(typeof window==='undefined'?globalThis:window);
