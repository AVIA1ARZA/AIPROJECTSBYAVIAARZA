const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const B='#8C6249',G='#2D4739',I='#FDFBF7';
const wrap=(bg,svg)=>`<html><body style="margin:0;width:1080px;height:1920px;overflow:hidden;background:${bg}">
<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">${svg}</svg></body></html>`;
// organic petal (leaf) pointing up from origin, scaled via transform
const petal='M0 0C-70 -90 -70 -230 0 -330C70 -230 70 -90 0 0Z';
const bgs={
 '1-ivory-soft-blobs':wrap(I,`
  <circle cx="120" cy="260" r="520" fill="${B}" opacity=".08"/>
  <circle cx="1000" cy="1700" r="470" fill="${G}" opacity=".07"/>
  <circle cx="930" cy="470" r="150" fill="none" stroke="${B}" stroke-width="6" opacity=".28"/>
  <circle cx="160" cy="1380" r="90" fill="${B}" opacity=".12"/>`),
 '2-forest-rings':wrap(G,`
  <g fill="none" stroke="${I}" stroke-width="3" opacity=".12">${[180,320,460,600,740,880].map(r=>`<circle cx="930" cy="1560" r="${r}"/>`).join('')}</g>
  <circle cx="90" cy="300" r="380" fill="${B}" opacity=".22"/>
  <circle cx="860" cy="360" r="46" fill="${I}" opacity=".16"/>`),
 '3-earth-petals':wrap(B,`
  <g transform="translate(540 1500)" fill="none" stroke="${I}" stroke-width="4" opacity=".22">
   ${[-60,-30,0,30,60].map(a=>`<path d="${petal}" transform="rotate(${a}) scale(1.6)"/>`).join('')}
  </g>
  <g transform="translate(540 1500)" fill="${I}" opacity=".07">
   ${[-60,-30,0,30,60].map(a=>`<path d="${petal}" transform="rotate(${a}) scale(1.6)"/>`).join('')}
  </g>
  <circle cx="540" cy="1500" r="26" fill="${I}" opacity=".3"/>
  <circle cx="960" cy="330" r="200" fill="${G}" opacity=".18"/>`),
 '4-ivory-line-flow':wrap(I,`
  <path d="M-40 1640C240 1440 160 1180 420 1060S860 1100 760 760S560 420 900 300" fill="none" stroke="${B}" stroke-width="7" stroke-linecap="round" opacity=".5"/>
  <circle cx="900" cy="300" r="34" fill="none" stroke="${B}" stroke-width="7" opacity=".6"/>
  <circle cx="900" cy="300" r="10" fill="${B}" opacity=".6"/>
  <circle cx="-60" cy="1700" r="380" fill="${G}" opacity=".07"/>
  <circle cx="1040" cy="1020" r="240" fill="${B}" opacity=".07"/>`),
 '5-sand-text-card':wrap('linear-gradient(180deg,#FDFBF7 0%,#F2EADF 100%)',`
  <g fill="none" stroke="${G}" stroke-width="3" opacity=".09">${[260,400,540].map(r=>`<circle cx="1000" cy="200" r="${r}"/>`).join('')}</g>
  <g fill="none" stroke="${B}" stroke-width="3" opacity=".14">${[200,340].map(r=>`<circle cx="80" cy="1760" r="${r}"/>`).join('')}</g>
  <rect x="90" y="640" width="900" height="640" rx="56" fill="#fff" opacity=".7"/>
  <rect x="90" y="640" width="900" height="640" rx="56" fill="none" stroke="${B}" stroke-width="3" opacity=".25"/>
  <rect x="440" y="700" width="200" height="8" rx="4" fill="${B}" opacity=".5"/>`)
};
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const p=await b.newPage({viewport:{width:1080,height:1920}});
  for(const [n,h] of Object.entries(bgs)){await p.setContent(h);await p.screenshot({path:n+'.png'});}
  await b.close();
})();
