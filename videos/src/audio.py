import wave, struct, math, random
SR=44100; D=15.0; N=int(SR*D)
random.seed(7)
buf=[0.0]*N
def add(t0, dur, fn, vol=1.0):
    i0=int(t0*SR)
    for i in range(int(dur*SR)):
        j=i0+i
        if j>=N: break
        buf[j]+=fn(i/SR)*vol
def env(x,a=0.005,d=1.0):  # fast attack, exp decay
    return min(1,x/a)*math.exp(-x/d)
def tone(f,d=0.3,a=0.004,harm=((1,1),(2,.25),(3,.08))):
    return lambda x: sum(h*math.sin(2*math.pi*f*m*x) for m,h in harm)*env(x,a,d)
# ambient pad: soft Am9-ish chord with slow swell
for f,v in [(110,.5),(164.81,.4),(220,.35),(329.63,.2),(246.94,.18)]:
    add(0,D,lambda x,f=f: math.sin(2*math.pi*f*x+0.4*math.sin(2*math.pi*.17*x))*(0.55+0.45*math.sin(2*math.pi*.11*x+f))*min(1,x/1.5)*min(1,(D-x)/1.0),0.030*v)
# UI taps
for t in [2.0,3.0,4.2,5.0,5.9,7.7]:
    add(t,.12,lambda x: math.sin(2*math.pi*(1500-3000*x)*x)*math.exp(-x/0.02),0.20)
    add(t,.20,tone(520,.07,harm=((1,1),)),0.07)
# page transitions: soft whoosh (filtered noise)
for t in [3.1,6.0,8.55]:
    st={'y':0.0}
    def wh(x,st=st):
        st['y']+= (random.uniform(-1,1)-st['y'])*(0.06+0.25*math.sin(math.pi*min(1,x/.45)))
        return st['y']*math.sin(math.pi*min(1,x/.45))
    add(t,.45,wh,0.09)
# payment processing: gentle ticking
for k in range(4):
    add(7.78+k*.2,.08,tone(900,.03,harm=((1,1),)),0.05)
# success chime (client)
add(8.78,1.2,tone(784,.45),0.16); add(8.90,1.2,tone(1174.7,.55),0.14); add(9.02,1.4,tone(1568,.7),0.10)
# phone buzz + notification chime
add(9.25,.7,lambda x: (1 if math.sin(2*math.pi*34*x)>0 else -.2)*math.sin(2*math.pi*135*x),0.07)
add(9.27,1.6,tone(1318.5,.55,harm=((1,1),(2.01,.3),(3.02,.12))),0.20)
add(9.40,1.8,tone(1760,.7,harm=((1,1),(2.01,.3),(3.02,.12))),0.18)
# "Yes!" whoosh + sparkle arpeggio
st={'y':0.0}
def up(x):
    st['y']+=(random.uniform(-1,1)-st['y'])*(0.03+0.4*x/.5)
    return st['y']*math.sin(math.pi*min(1,x/.5))
add(9.85,.5,up,0.16)
for i,f in enumerate([523.25,659.25,783.99,1046.5,1318.5]):
    add(10.25+i*.075,.9,tone(f,.28,harm=((1,1),(2,.2))),0.13)
# settle back: soft low note
add(12.2,1.4,tone(196,.6,harm=((1,1),(2,.3))),0.09)
# end card swell
for f,v in [(261.63,.5),(392,.4),(523.25,.35),(659.25,.25)]:
    add(13.1,1.9,lambda x,f=f: math.sin(2*math.pi*f*x)*math.sin(math.pi*min(1,x/1.9))**1.5,0.07*v)
add(13.2,1.7,tone(1046.5,.9),0.07)
# master: fade in/out + soft clip
out=[]
for i,v in enumerate(buf):
    t=i/SR
    v*=min(1,t/.15)*min(1,(D-t)/.6)
    v=math.tanh(v*1.6)*0.8
    out.append(v)
w=wave.open('audio.wav','wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
w.writeframes(b''.join(struct.pack('<h',int(max(-1,min(1,v))*32000)) for v in out)); w.close()
print('ok',max(abs(v) for v in out))
