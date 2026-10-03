Source for holisticlick_15s.mp4 (HTML/SVG animation, rendered frame by frame).
Render: `npm i playwright-core`, then `node render.js video` (-> silent.mp4), `python3 audio.py` (-> audio.wav),
then `ffmpeg -i silent.mp4 -i audio.wav -c:v copy -c:a aac -shortest out.mp4`.
Timeline constants (T_*, TAPS) are at the top of the script in scene.html.
