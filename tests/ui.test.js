const test=require('node:test'),assert=require('node:assert/strict');
const {swipeDirection}=require('../ui');
test('horizontal swipes navigate in both directions',()=>{assert.equal(swipeDirection(-100,10,240),1);assert.equal(swipeDirection(100,-10,240),-1);});
test('scrolls, taps, short drags and slow drags never change weeks',()=>{for(const args of [[20,2,100],[100,100,200],[5,120,250],[100,0,900],[0,0,0]])assert.equal(swipeDirection(...args),0);});
test('touch gestures dispatch navigation and sheet dismissal without swallowing vertical scroll',()=>{
 const vm=require('node:vm'),fs=require('node:fs');const listeners={},clicks=[];let clock=0;
 const context={performance:{now:()=>clock},innerWidth:390,document:{addEventListener:(name,fn)=>{(listeners[name]||=[]).push(fn)},querySelector:selector=>({click:()=>clicks.push(selector)})}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../ui'),'utf8'),context);
 function drag(x,y,endX,endY,sheet=false){const target={closest:selector=>selector==='.dialog-top'?sheet:selector==='.week-list'?!sheet:false};listeners.pointerdown[0]({pointerType:'touch',isPrimary:true,pointerId:1,clientX:x,clientY:y,target});clock+=200;listeners.pointerup[0]({pointerId:1,clientX:endX,clientY:endY});}
 drag(250,200,100,210);assert.match(clicks.pop(),/week-next/);
 drag(100,200,110,350);assert.equal(clicks.length,0);
 drag(10,200,160,210);assert.equal(clicks.length,0);
 drag(180,200,185,310,true);assert.equal(clicks.pop(),'#close-dialog');
});
