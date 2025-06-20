import { useEffect, useRef, useState } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';
import mustacheImgSrc from './assets/overlays/mustache.png';
import glassesImgSrc from './assets/overlays/glasses.png';
import cartierImgSrc from './assets/overlays/cartiersunglass.png';
import emojiSurprised from './assets/overlays/emoji_surprised.png';

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mirrorCanvasRef = useRef(null);
  const [useCartier, setUseCartier] = useState(false);
  const [glassesOn, setGlassesOn] = useState(true);

  useEffect(() => {
    const faceMesh = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    const mustacheImg = new Image();
    mustacheImg.src = mustacheImgSrc;

    const glassesImg = new Image();
    glassesImg.src = glassesImgSrc;

    const cartierImg = new Image();
    cartierImg.src = cartierImgSrc;

    const activeGlassesImg = () => (useCartier ? cartierImg : glassesImg);

    const drawOverlays = (ctx, landmarks) => {
      const width = ctx.canvas.width;
      const height = ctx.canvas.height;

      // Draw face landmarks (blue dots)
      for (const point of landmarks) {
        ctx.beginPath();
        ctx.arc(point.x * width, point.y * height, 2, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(0,180,255,0.7)';
        ctx.shadowColor = 'rgba(0,180,255,0.5)';
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Mustache (optional, commented out)
      // const nose = landmarks[1];
      // const leftMouth = landmarks[61];
      // const rightMouth = landmarks[291];
      // const mustacheWidth = Math.abs(leftMouth.x - rightMouth.x) * width * 1.5;
      // const mustacheHeight = mustacheWidth / 3;
      // const mustacheX = ((leftMouth.x + rightMouth.x) / 2) * width - mustacheWidth / 2;
      // const mustacheY = nose.y * height;
      // ctx.drawImage(mustacheImg, mustacheX, mustacheY, mustacheWidth, mustacheHeight);

      // Glasses (toggleable)
      if (glassesOn) {
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];
        const eyeCenterY = (leftEye.y + rightEye.y) / 2;
        const glassesWidth = Math.abs(leftEye.x - rightEye.x) * width * 2;
        const glassesHeight = glassesWidth / 3;
        const glassesX = ((leftEye.x + rightEye.x) / 2) * width - glassesWidth / 2;
        const glassesY = eyeCenterY * height - glassesHeight / 2;
        ctx.drawImage(activeGlassesImg(), glassesX, glassesY, glassesWidth, glassesHeight);
      }
    };

    const drawResults = (results) => {
      const canvasCtx = canvasRef.current.getContext('2d');
      const mirrorCtx = mirrorCanvasRef.current.getContext('2d');
      const width = canvasRef.current.width;
      const height = canvasRef.current.height;
      canvasCtx.clearRect(0, 0, width, height);
      mirrorCtx.clearRect(0, 0, width, height);
      // Player 1
      canvasCtx.save();
      canvasCtx.drawImage(results.image, 0, 0, width, height);
      if (results.multiFaceLandmarks?.length > 0) {
        drawOverlays(canvasCtx, results.multiFaceLandmarks[0]);
      }
      canvasCtx.restore();
      // Player 2 (mirrored)
      mirrorCtx.save();
      mirrorCtx.translate(width, 0);
      mirrorCtx.scale(-1, 1);
      mirrorCtx.drawImage(results.image, 0, 0, width, height);
      if (results.multiFaceLandmarks?.length > 0) {
        drawOverlays(mirrorCtx, results.multiFaceLandmarks[0]);
      }
      mirrorCtx.restore();
    };

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        await faceMesh.send({ image: videoRef.current });
      },
      width: 640,
      height: 480,
    });

    faceMesh.onResults(drawResults);
    camera.start();

    return () => camera.stop();
  }, [useCartier, glassesOn]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#232526] via-[#414345] to-[#232526] relative overflow-hidden">
      {/* Glassmorphism background effect */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="w-full h-full bg-white/10 backdrop-blur-2xl" />
      </div>

      {/* Controls */}
      <div className="z-20 flex flex-row items-center justify-center gap-10 mt-8 mb-4 w-full max-w-2xl mx-auto bg-white/30 backdrop-blur-2xl rounded-3xl shadow-2xl py-5 px-12 border border-white/30 drop-shadow-lg" style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.25)' }}>
        {/* Glasses Toggle Switch */}
        <div className="flex items-center gap-3">
          <span className="text-white font-semibold text-base tracking-wide">Glasses</span>
          <button
            onClick={() => setGlassesOn((prev) => !prev)}
            className={`w-14 h-7 flex items-center rounded-full p-1 duration-300 ease-in-out border-2 border-white/50 shadow-inner focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all ${glassesOn ? 'bg-green-400/80' : 'bg-gray-400/60'} hover:scale-105`}
            aria-label="Toggle Glasses"
          >
            <div
              className={`bg-white w-6 h-6 rounded-full shadow-md transform duration-300 ease-in-out ${glassesOn ? 'translate-x-7' : ''}`}
            />
          </button>
        </div>
        {/* Glasses Style Switch */}
        <div className="flex items-center gap-3">
          <span className="text-white font-semibold text-base tracking-wide">Style</span>
          <button
            onClick={() => setUseCartier((prev) => !prev)}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-yellow-400 text-white font-bold shadow-lg hover:scale-105 duration-200 border-2 border-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-300 transition-all"
            aria-label="Switch Glasses Style"
          >
            {useCartier ? (
              <>
                <span>Cartier</span>
                <span role="img" aria-label="Cartier">😎</span>
              </>
            ) : (
              <>
                <span>Default</span>
                <span role="img" aria-label="Default">🤓</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Game Layout */}
      <div className="z-10 flex flex-row items-center justify-center gap-20 w-full max-w-6xl py-10">
        {/* Player 1 */}
        <div className="relative w-[420px] h-[315px] rounded-3xl overflow-hidden shadow-2xl border-2 border-white/40 bg-white/10 backdrop-blur-lg drop-shadow-xl">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute top-0 left-0 w-full h-full object-cover z-0 opacity-0"
          />
          <canvas
            ref={canvasRef}
            width={420}
            height={315}
            className="absolute top-0 left-0 z-10 pointer-events-none rounded-3xl"
          />
        </div>

        {/* Reference Emoji (smaller, centered) */}
        <div className="flex flex-col items-center gap-2">
          <div className="rounded-full bg-white/80 flex items-center justify-center" style={{ width: '1.2em', height: '1.2em', minWidth: '1.2em', minHeight: '1.2em' }}>
            <img
              src={emojiSurprised}
              alt="Reference Face"
              style={{ width: '1em', height: '1em', objectFit: 'contain', display: 'block' }}
            />
          </div>
          <p className="text-white font-bold text-center text-xs mt-1 tracking-wide drop-shadow">Mimic this!</p>
        </div>

        {/* Player 2 */}
        <div className="relative w-[420px] h-[315px] rounded-3xl overflow-hidden shadow-2xl border-2 border-pink-400/60 bg-white/10 backdrop-blur-lg drop-shadow-xl">
          <canvas
            ref={mirrorCanvasRef}
            width={420}
            height={315}
            className="absolute top-0 left-0 z-10 pointer-events-none rounded-3xl"
          />
        </div>
      </div>

      {/* Footer or credits (optional aesthetic) */}
      <div className="z-20 mt-8 mb-4 text-white/60 text-xs tracking-wide font-mono">FaceSwap Showdown &copy; 2024</div>
    </div>
  );
}

export default App;
