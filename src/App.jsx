import { useEffect, useRef, useState } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';
import mustacheImgSrc from './assets/overlays/mustache.png';
import glassesImgSrc from './assets/overlays/glasses.png';
import cartierImgSrc from './assets/overlays/cartiersunglass.png';

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

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

    const drawResults = (results) => {
      const canvasCtx = canvasRef.current.getContext('2d');
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      canvasCtx.drawImage(
        results.image,
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );

      if (results.multiFaceLandmarks?.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];

        // Dots
        for (const point of landmarks) {
          canvasCtx.beginPath();
          canvasCtx.arc(
            point.x * canvasRef.current.width,
            point.y * canvasRef.current.height,
            1.5,
            0,
            2 * Math.PI
          );
          canvasCtx.fillStyle = 'cyan';
          canvasCtx.fill();
        }

        // Mustache
        const nose = landmarks[1];
        const leftMouth = landmarks[61];
        const rightMouth = landmarks[291];

        const mustacheWidth =
          Math.abs(rightMouth.x - leftMouth.x) * canvasRef.current.width * 1.5;
        const mustacheHeight = mustacheWidth / 3;

        const mustacheX =
          ((leftMouth.x + rightMouth.x) / 2) * canvasRef.current.width -
          mustacheWidth / 2;
        const mustacheY = nose.y * canvasRef.current.height;

        canvasCtx.drawImage(
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

        const glassesWidth =
          Math.abs(rightEye.x - leftEye.x) * canvasRef.current.width * 2;
        const glassesHeight = glassesWidth / 3;

        const glassesX =
          ((leftEye.x + rightEye.x) / 2) * canvasRef.current.width -
          glassesWidth / 2;
        const glassesY = eyeCenterY * canvasRef.current.height - glassesHeight / 2;

        canvasCtx.drawImage(
          activeGlassesImg(),
          glassesX,
          glassesY,
          glassesWidth,
          glassesHeight
        );
      }

      canvasCtx.restore();
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
    <div className="flex flex-col items-center justify-center h-screen bg-black space-y-4">
      <div className="relative w-[640px] h-[480px]">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute top-0 left-0 w-full h-full object-cover z-0"
        />
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none"
        />
      </div>
      <button
        onClick={() => setUseCartier((prev) => !prev)}
        className="px-6 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition"
      >
        Switch to {useCartier ? 'Regular Glasses' : 'Cartier Glasses'}
      </button>
    </div>
  );
}

export default App;
