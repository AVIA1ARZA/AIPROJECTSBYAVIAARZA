const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const fs=require('fs'),path=require('path');
(async()=>{
  const out=process.argv[2]; fs.mkdirSync(out,{recursive:true});
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const p=await b.newPage({viewport:{width:1080,height:1920}});
  await p.goto('file://'+path.resolve('scene.html')); await p.evaluate(()=>document.fonts.ready);
  const FPS=30,N=FPS*6;
  for(let i=0;i<N;i++){await p.evaluate(t=>setT(t),i/FPS);await p.screenshot({path:`${out}/f${String(i).padStart(4,'0')}.png`});}
  await b.close();
})();
