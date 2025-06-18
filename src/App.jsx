import { useEffect, useRef, useState } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';
import mustacheImgSrc from './assets/overlays/mustache.png';
import glassesImgSrc from './assets/overlays/glasses.png';
import cartierImgSrc from './assets/overlays/cartiersunglass.png';

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mirrorCanvasRef = useRef(null);
  const [useCartier, setUseCartier] = useState(false);

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

      // Blue dots
      for (const point of landmarks) {
        ctx.beginPath();
        ctx.arc(point.x * width, point.y * height, 1.5, 0, 2 * Math.PI);
        ctx.fillStyle = 'cyan';
        ctx.fill();
      }

      // Mustache
      const nose = landmarks[1];
      const leftMouth = landmarks[61];
      const rightMouth = landmarks[291];

      const mustacheWidth = Math.abs(leftMouth.x - rightMouth.x) * width * 1.5;
      const mustacheHeight = mustacheWidth / 3;

      const mustacheX =
        ((leftMouth.x + rightMouth.x) / 2) * width - mustacheWidth / 2;
      const mustacheY = nose.y * height;

      ctx.drawImage(
        mustacheImg,
        mustacheX,
        mustacheY,
        mustacheWidth,
        mustacheHeight
      );

      // Glasses
      const leftEye = landmarks[33];
      const rightEye = landmarks[263];
      const eyeCenterY = (leftEye.y + rightEye.y) / 2;

      const glassesWidth = Math.abs(leftEye.x - rightEye.x) * width * 2;
      const glassesHeight = glassesWidth / 3;

      const glassesX =
        ((leftEye.x + rightEye.x) / 2) * width - glassesWidth / 2;
      const glassesY = eyeCenterY * height - glassesHeight / 2;

      ctx.drawImage(
        activeGlassesImg(),
        glassesX,
        glassesY,
        glassesWidth,
        glassesHeight
      );
    };

    const drawResults = (results) => {
      const canvasCtx = canvasRef.current.getContext('2d');
      const mirrorCtx = mirrorCanvasRef.current.getContext('2d');

      const width = canvasRef.current.width;
      const height = canvasRef.current.height;

      canvasCtx.clearRect(0, 0, width, height);
      mirrorCtx.clearRect(0, 0, width, height);

      // Draw Player 1 (normal feed)
      canvasCtx.save();
      canvasCtx.drawImage(results.image, 0, 0, width, height);
      if (results.multiFaceLandmarks?.length > 0) {
        drawOverlays(canvasCtx, results.multiFaceLandmarks[0]);
      }
      canvasCtx.restore();

      // Draw Player 2 (mirrored feed)
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
  }, [useCartier]);

  return (
    <>
      <button
        onClick={() => setUseCartier((prev) => !prev)}
        className="absolute top-4 left-4 z-50 bg-white text-black px-4 py-2 rounded shadow-md"
      >
        Toggle Glasses: {useCartier ? 'Cartier 😎' : 'Default 🤓'}
      </button>

      <div className="flex items-center justify-center h-screen bg-black">
        {/* Player 1 */}
        <div className="relative w-[640px] h-[480px] mx-4">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute top-0 left-0 w-full h-full object-cover z-0 hidden"
          />
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="absolute top-0 left-0 z-10 pointer-events-none rounded-lg border-2 border-white"
          />
        </div>

        {/* Player 2 (mirrored feed + correct overlays) */}
        <div className="relative w-[640px] h-[480px] mx-4">
          <canvas
            ref={mirrorCanvasRef}
            width={640}
            height={480}
            className="absolute top-0 left-0 z-10 pointer-events-none rounded-lg border-2 border-pink-500"
          />
        </div>
      </div>
    </>
  );
}

export default App;
