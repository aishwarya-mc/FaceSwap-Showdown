import { useEffect, useRef } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

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

    faceMesh.onResults((results) => {
      const canvasCtx = canvasRef.current.getContext('2d');
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      canvasCtx.drawImage(
        results.image, 0, 0, canvasRef.current.width, canvasRef.current.height
      );

      if (results.multiFaceLandmarks) {
        for (const landmarks of results.multiFaceLandmarks) {
          for (const point of landmarks) {
            canvasCtx.beginPath();
            canvasCtx.arc(point.x * canvasRef.current.width, point.y * canvasRef.current.height, 1.5, 0, 2 * Math.PI);
            canvasCtx.fillStyle = 'cyan';
            canvasCtx.fill();
          }
        }
      }
      canvasCtx.restore();
    });

    if (
      typeof videoRef.current !== 'undefined' &&
      videoRef.current !== null
    ) {
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          await faceMesh.send({ image: videoRef.current });
        },
        width: 640,
        height: 480,
      });
      camera.start();
    }
  }, []);

  return (
    <div className="flex items-center justify-center h-screen bg-black">
      <video ref={videoRef} className="hidden" />
      <canvas ref={canvasRef} width={640} height={480} className="rounded-xl border-4 border-white shadow-lg" />
    </div>
  );
}

export default App;
