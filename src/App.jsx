import { useEffect, useRef, useState } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';
import mustacheImgSrc from './assets/overlays/mustache.png';
import glassesImgSrc from './assets/overlays/glasses.png';
import cartierImgSrc from './assets/overlays/cartiersunglass.png';
import emojiSurprised from './assets/overlays/mr_bean.png';
import './index.css';


function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mirrorCanvasRef = useRef(null);
  const [useCartier, setUseCartier] = useState(false);
  const [glassesOn, setGlassesOn] = useState(true);
  const [similarityScore, setSimilarityScore] = useState(null);

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

    // Load and analyze Mr. Bean's face
    const mrBeanImg = new Image();
    mrBeanImg.crossOrigin = 'anonymous';
    mrBeanImg.src = emojiSurprised;
    
    mrBeanImg.onload = async () => {
      console.log("🟢 Mr. Bean image loaded, starting analysis...");
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = 420;
      tmpCanvas.height = 315;
      const tmpCtx = tmpCanvas.getContext('2d');
      tmpCtx.drawImage(mrBeanImg, 0, 0, 420, 315);

      const tmpFaceMesh = new FaceMesh({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      tmpFaceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      tmpFaceMesh.onResults((results) => {
        if (results.multiFaceLandmarks?.length > 0) {
          const mrBeanLandmarks = results.multiFaceLandmarks[0];
          const normalized = normalizeLandmarks(mrBeanLandmarks);
          console.log("🟣 Mr. Bean RAW coordinates:", mrBeanLandmarks);
          console.log("🟣 Mr. Bean NORMALIZED vector:", normalized);
          window.mrBeanVector = normalized;
        } else {
          console.warn("🟡 Mr. Bean face NOT detected in the image.");
        }
      });

      try {
        await tmpFaceMesh.send({ image: tmpCanvas });
      } catch (error) {
        console.error("Error analyzing Mr. Bean:", error);
      }
    };

    mrBeanImg.onerror = () => {
      console.error( "Failed to load Mr. Bean image");
    };

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
        ctx.fillStyle = 'rgba(0,180,255,0.0)';
        ctx.shadowColor = 'rgba(0,180,255,0.0)';
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
    const landmarks = results.multiFaceLandmarks[0];

    // ✅ STEP 1: Normalize landmark positions for Player 1
    const normalizedLandmarks = normalizeLandmarks(landmarks);
    console.log("Player 1 vector:", normalizedLandmarks);


    if (window.mrBeanVector?.length === 478) {
  const similarity = computeCosineSimilarity(normalizedLandmarks, window.mrBeanVector);
  console.log("🔍 Cosine Similarity with Mr. Bean:", similarity.toFixed(4));
  setSimilarityScore(similarity);
}


    drawOverlays(canvasCtx, landmarks);
  }
  canvasCtx.restore();

  // Player 2 (mirrored)
  mirrorCtx.save();
  mirrorCtx.translate(width, 0);
  mirrorCtx.scale(-1, 1);
  mirrorCtx.drawImage(results.image, 0, 0, width, height);
  if (results.multiFaceLandmarks?.length > 0) {
    const landmarks = results.multiFaceLandmarks[0];

    // ✅ (same face used, mirror mode — keep for symmetry, can refine later)
    const normalizedLandmarks = normalizeLandmarks(landmarks);
    console.log("Player 2 vector:", normalizedLandmarks);

    drawOverlays(mirrorCtx, landmarks);
  }
  mirrorCtx.restore();
};



  function normalizeLandmarks(landmarks) {
  const ref = landmarks[1]; // Nose tip
  return landmarks.map(pt => ({
    x: pt.x - ref.x,
    y: pt.y - ref.y,
  }));
}


function computeCosineSimilarity(vec1, vec2) {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vec1.length; i++) {
    const a = vec1[i];
    const b = vec2[i];

    dot += a.x * b.x + a.y * b.y;
    normA += a.x ** 2 + a.y ** 2;
    normB += b.x ** 2 + b.y ** 2;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}







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

<div className="z-50 flex flex-row items-center justify-center gap-5 mt-6 mb-10 w-full max-w-3xl mx-auto bg-black/40 rounded-2xl py-10 px-16 border-2 border-white shadow-2xl backdrop-blur-md">





  {/* Glasses Toggle Switch */}
  <div className="flex items-center gap-4">
    <span className="text-white font-semibold text-lg tracking-wide min-w-[80px]">Glasses</span>
    <button
      onClick={() => setGlassesOn((prev) => !prev)}
      className={`w-16 h-8 flex items-center rounded-full p-1 duration-300 ease-in-out border-2 border-white/50 shadow-inner focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all ${glassesOn ? 'bg-green-400/80' : 'bg-gray-400/60'} hover:scale-105`}
      aria-label="Toggle Glasses"
    >
      <div
        className={`bg-white w-7 h-7 rounded-full shadow-md transform duration-300 ease-in-out ${glassesOn ? 'translate-x-7' : ''}`}
      />
    </button>
  </div>

  {/* Glasses Style Switch */}
  <div className="flex items-center gap-4">
    <span className="text-white font-semibold text-lg tracking-wide min-w-[80px]">Style</span>
    <button
      onClick={() => setUseCartier((prev) => !prev)}
      className="flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-yellow-400 text-white font-bold shadow-lg hover:scale-105 duration-200 border-2 border-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-300 transition-all min-w-[140px]"
      aria-label="Switch Glasses Style"
    >
      {useCartier ? (
        <>
          <span className="whitespace-nowrap">Cartier</span>
          <span role="img" aria-label="Cartier">😎</span>
        </>
      ) : (
        <>
          <span className="whitespace-nowrap">Default</span>
          <span role="img" aria-label="Default">🤓</span>
        </>
      )}
    </button>
  </div>
</div>

      {/* Main Game Layout */}
      <div className="z-10 flex flex-row items-center justify-center gap-20 w-full max-w-6xl py-10">



        <div className="flex flex-col items-center gap-2">
  <span className="text-white font-bold text-lg tracking-wide drop-shadow">Player 1</span>
  {similarityScore !== null && (
    <span className="text-green-300 font-mono text-sm tracking-wider drop-shadow">
      Score: {Math.floor(similarityScore * 100)}
    </span>
  )}

  
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
</div>





        {/* Reference Emoji (smaller, centered) */}
        <div className="flex flex-col items-center gap-2">
          <div className="rounded-2xl bg-white/80 flex items-center justify-center p-3 shadow-lg">
            <img
              src={emojiSurprised}
              alt="Reference Face"
              className="w-32 h-32 object-contain rounded-xl"
            />
          </div>
          <p className="text-white font-bold text-center text-base mt-2 tracking-wide drop-shadow">Mimic this!</p>
                    {/* ✅ Display Similarity Score */}
          {similarityScore && (
            <p className="text-center mt-4 text-white text-lg font-semibold tracking-wide bg-gradient-to-r from-green-400 via-yellow-400 to-pink-400 bg-clip-text text-transparent animate-pulse">
              Similarity Score: {(similarityScore * 100).toFixed(2)}
            </p>
          )}
        </div>



      {/* Player 2 Block */}
      <div className="flex flex-col items-center gap-3">
        <p className="text-white font-semibold text-xl tracking-wide bg-gradient-to-r from-pink-500 to-yellow-400 px-6 py-1 rounded-full shadow-lg animate-pulse">
          Player 2
        </p>
        <div className="relative w-[420px] h-[315px] rounded-3xl overflow-hidden shadow-2xl border-2 border-pink-400/60 bg-white/10 backdrop-blur-lg drop-shadow-xl">
          <canvas
            ref={mirrorCanvasRef}
            width={420}
            height={315}
            className="absolute top-0 left-0 z-10 pointer-events-none rounded-3xl"
          />
        </div>
      </div>



      </div>

      {/* Footer or credits (optional aesthetic) */}
      <div className="z-20 mt-8 mb-4 text-white/60 text-xs tracking-wide font-mono">FaceSwap Showdown &copy; 2024</div>
    </div>
  );
}

export default App;
