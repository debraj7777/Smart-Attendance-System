import * as faceapi from 'face-api.js/dist/face-api.js';

let modelsPromise = null;

/**
 * Loads SSD MobileNet v1, 68-point facial landmarks, and ResNet-34 face recognition
 * models from local `/models` once per session.
 */
export function loadFaceModels() {
  if (!modelsPromise) {
    const MODEL_URL = '/models';
    modelsPromise = Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]).catch((err) => {
      modelsPromise = null;
      throw err;
    });
  }
  return modelsPromise;
}

const DETECTOR_OPTIONS = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.65 });

/**
 * Detects faces in a video element and ensures exactly one well-framed face is present.
 */
export async function detectSingleQualifiedFace(videoEl) {
  if (!videoEl || videoEl.readyState < 2 || videoEl.videoWidth === 0) {
    return { status: 'not_ready' };
  }

  const detections = await faceapi
    .detectAllFaces(videoEl, DETECTOR_OPTIONS)
    .withFaceLandmarks()
    .withFaceDescriptors();

  if (!detections || detections.length === 0) {
    return { status: 'no_face' };
  }
  if (detections.length > 1) {
    return { status: 'multiple_faces', count: detections.length };
  }

  const detection = detections[0];
  const minFaceWidth = Math.max(85, videoEl.videoWidth * 0.15);
  if (detection.detection.box.width < minFaceWidth) {
    return { status: 'too_far' };
  }

  return { status: 'ok', detection };
}

/**
 * Averages multiple 128-D descriptors and L2-normalizes the result.
 */
export function averageDescriptors(descriptors) {
  if (!descriptors.length) return null;
  const len = descriptors[0].length;
  const mean = new Float32Array(len);

  for (const desc of descriptors) {
    for (let i = 0; i < len; i++) {
      mean[i] += desc[i];
    }
  }
  for (let i = 0; i < len; i++) {
    mean[i] /= descriptors.length;
  }

  // L2-normalize to preserve Euclidean distance scale on unit sphere
  let norm = 0;
  for (let i = 0; i < len; i++) {
    norm += mean[i] * mean[i];
  }
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < len; i++) {
    mean[i] /= norm;
  }

  return Array.from(mean);
}

function pointDist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function eyeAspectRatio(pts) {
  const v1 = pointDist(pts[1], pts[5]);
  const v2 = pointDist(pts[2], pts[4]);
  const h = pointDist(pts[0], pts[3]);
  return h > 0 ? (v1 + v2) / (2 * h) : 0;
}

/**
 * Computes average Eye Aspect Ratio (EAR) from 68-point landmarks.
 * Open eyes typically ~0.26–0.36; closed/blinking drops below ~0.21.
 */
export function computeEyeAspectRatio(landmarks) {
  const pts = landmarks.positions;
  const leftEye = pts.slice(36, 42);
  const rightEye = pts.slice(42, 48);
  return (eyeAspectRatio(leftEye) + eyeAspectRatio(rightEye)) / 2;
}

/**
 * Computes horizontal nose position ratio between left (0) and right (16) jaw contour points.
 * Frontal pose is ~0.50; head turns shift below 0.37 or above 0.63.
 */
export function computeYawRatio(landmarks) {
  const pts = landmarks.positions;
  const leftCheek = pts[0];
  const rightCheek = pts[16];
  const noseTip = pts[30];
  const faceWidth = rightCheek.x - leftCheek.x;
  if (faceWidth <= 0) return 0.5;
  return (noseTip.x - leftCheek.x) / faceWidth;
}
