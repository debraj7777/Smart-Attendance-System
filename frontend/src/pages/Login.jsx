import React, { useState, useContext, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Camera, CheckCircle, Eye, EyeOff } from 'lucide-react';
import * as faceapi from 'face-api.js/dist/face-api.js';

const Login = () => {
  const [role, setRole] = useState('Student');
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  
  const [faceImage, setFaceImage] = useState(null);
  const [faceDescriptor, setFaceDescriptor] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [scanning, setScanning] = useState(false);

  const { login, register } = useContext(AuthContext);
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = 'https://cdn.jsdelivr.net/gh/cgarciagl/face-api.js@0.22.2/weights';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error("Error loading face-api models:", err);
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    if (!isLogin && role === 'Student' && modelsLoaded) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isLogin, role, modelsLoaded]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access denied:", err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const captureFace = async () => {
    if (!videoRef.current) return;
    setScanning(true);
    
    // Capture image
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    const base64Image = canvas.toDataURL('image/jpeg');

    // Extract descriptor
    const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
                                   .withFaceLandmarks()
                                   .withFaceDescriptor();
    
    if (detection) {
      setFaceImage(base64Image);
      setFaceDescriptor(Array.from(detection.descriptor));
    } else {
      alert("No face detected! Please look directly at the camera and ensure good lighting.");
    }
    setScanning(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        const res = await login(email, password, role);
        
        // Mandatory Biometric Routing Guard
        if (res.role === 'Student' && (!res.faceDescriptor || res.faceDescriptor.length === 0)) {
          navigate('/enroll-face');
        } else {
          if (role === 'Admin') navigate('/admin');
          if (role === 'Teacher') navigate('/teacher');
          if (role === 'Student') navigate('/student');
        }
      } else {
        if (role === 'Student' && !faceDescriptor) {
          alert("Students must capture their face image to register.");
          return;
        }
        await register(name, email, password, role, null, faceDescriptor); // We pass null for faceImage to save storage
        
        if (role === 'Admin') navigate('/admin');
        if (role === 'Teacher') navigate('/teacher');
        if (role === 'Student') navigate('/student');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Authentication failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 w-full max-w-md overflow-hidden transition-all">
        
        <div className="flex border-b border-gray-100">
          {['Student', 'Teacher', 'Admin'].map((r) => (
            <button
              key={r}
              onClick={() => { setRole(r); setFaceImage(null); setFaceDescriptor(null); }}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${role === r ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            {isLogin ? `Sign In as ${role}` : `Create ${role} Account`}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                placeholder={`Enter ${role.toLowerCase()} email`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none pr-12"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {!isLogin && role === 'Student' && (
              <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200 text-center">
                <h3 className="text-sm font-semibold mb-2">Facial Recognition Setup</h3>
                {!modelsLoaded ? (
                  <p className="text-xs text-gray-500">Loading AI models (30MB)...</p>
                ) : faceDescriptor ? (
                  <div className="flex flex-col items-center">
                    <img src={faceImage} alt="Face" className="w-24 h-24 rounded-full object-cover mb-2 border-2 border-green-500" />
                    <span className="text-green-600 text-sm flex items-center"><CheckCircle className="w-4 h-4 mr-1"/> Face Data Saved</span>
                    <button type="button" onClick={() => { setFaceDescriptor(null); startCamera(); }} className="text-xs text-blue-500 mt-2 underline">Retake</button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-full h-48 bg-black rounded-lg overflow-hidden relative mb-3">
                      <video ref={videoRef} autoPlay muted className="w-full h-full object-cover transform scale-x-[-1]"></video>
                      {scanning && <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center text-white text-sm">Scanning Face...</div>}
                    </div>
                    <button type="button" onClick={captureFace} disabled={scanning} className="w-full bg-indigo-100 text-indigo-700 py-2 rounded-lg text-sm font-bold flex items-center justify-center hover:bg-indigo-200">
                      <Camera className="w-4 h-4 mr-2" />
                      Capture Face Data
                    </button>
                  </div>
                )}
              </div>
            )}

            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all">
              {isLogin ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => setIsLogin(!isLogin)} className="text-blue-600 font-semibold hover:underline">
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
