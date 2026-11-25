import React, { useRef, useState, useEffect } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { Camera, ShieldCheck, AlertCircle } from 'lucide-react';
import {
  loadFaceModels,
  detectSingleQualifiedFace,
  averageDescriptors,
  computeYawRatio,
} from '../utils/faceRecognition';

const ENROLL_SAMPLES = 5;

const FaceEnrollment = () => {
  const videoRef = useRef(null);
  const [loadingModels, setLoadingModels] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      try {
        await loadFaceModels();
        setLoadingModels(false);
        startVideo();
      } catch (err) {
        setError('Failed to load facial recognition models. Please refresh the page.');
      }
    };
    init();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startVideo = () => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(err => {
        console.error(err);
        setError('Camera permission denied. Facial enrollment requires a camera.');
      });
  };

  const handleCapture = async () => {
    setCapturing(true);
    setMessage('');
    setError(null);
    try {
      const samples = [];
      let attempts = 0;

      while (samples.length < ENROLL_SAMPLES && attempts < 20) {
        attempts += 1;
        setMessage(`Capturing face sample ${samples.length + 1}/${ENROLL_SAMPLES} — look directly at the camera...`);
        const res = await detectSingleQualifiedFace(videoRef.current);

        if (res.status === 'multiple_faces') {
          setError('Multiple faces detected. Ensure only you are in the camera frame.');
          setMessage('');
          return;
        }
        if (res.status === 'ok') {
          const yaw = computeYawRatio(res.detection.landmarks);
          if (yaw >= 0.38 && yaw <= 0.62) {
            samples.push(res.detection.descriptor);
          } else {
            setMessage('Please face the camera directly (head centered)...');
          }
        }
        await new Promise((r) => setTimeout(r, 180));
      }

      if (samples.length < ENROLL_SAMPLES) {
        setError('Could not capture enough clear frontal frames. Ensure good lighting and look straight at the camera.');
        setMessage('');
        return;
      }

      const faceDescriptor = averageDescriptors(samples);
      await api.post('/auth/enroll-face', { faceDescriptor });

      if (videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }

      navigate('/student');
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save facial data.');
    } finally {
      setCapturing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-center">
          <ShieldCheck className="w-12 h-12 text-white mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-white">Biometric Setup Required</h2>
          <p className="text-blue-100 mt-2 text-sm">Your administrator created your account. You must register your facial data before accessing the dashboard.</p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-lg flex items-start text-sm border border-red-100">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loadingModels ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-500 font-medium">Loading biometric security models...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="relative rounded-xl overflow-hidden bg-gray-900 border-4 border-gray-100 shadow-inner">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  muted 
                  className="w-full h-auto object-cover transform scale-x-[-1]" 
                />
                <div className="absolute inset-0 border-2 border-blue-400/30 rounded-xl pointer-events-none"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-64 border-2 border-dashed border-white/50 rounded-[40px] pointer-events-none opacity-50"></div>
              </div>

              <div className="text-center space-y-4">
                <p className="text-sm text-gray-600">
                  {message || 'Position your face inside the frame and click capture when ready.'}
                </p>
                <button
                  onClick={handleCapture}
                  disabled={capturing}
                  className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-all shadow-md disabled:bg-blue-300"
                >
                  <Camera className="w-5 h-5" />
                  <span>{capturing ? 'Processing...' : 'Capture & Enroll Face'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FaceEnrollment;
