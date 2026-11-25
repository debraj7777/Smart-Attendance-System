import React, { useState, useEffect, useRef, useContext } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { MapPin, Camera, CheckCircle, XCircle, Calendar, Play } from 'lucide-react';
import {
  loadFaceModels,
  detectSingleQualifiedFace,
  averageDescriptors,
  computeEyeAspectRatio,
  computeYawRatio,
} from '../utils/faceRecognition';

const ENABLE_LIVENESS = false;

const StudentDashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [routine, setRoutine] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Smart Marker State
  const [isMarking, setIsMarking] = useState(false);
  const [geoStatus, setGeoStatus] = useState('idle'); // idle, locating, success, failed
  const [verifiedCoords, setVerifiedCoords] = useState(null); // { lat, lng } once geofence passes
  const [cameraActive, setCameraActive] = useState(false);
  const [livenessStatus, setLivenessStatus] = useState('idle'); // idle, loading_models, ready, checking, verified, failed
  const [livenessPrompt, setLivenessPrompt] = useState('');
  const [liveDescriptor, setLiveDescriptor] = useState(null); // 128-D averaged descriptor captured after liveness
  const [selectedRoutineId, setSelectedRoutineId] = useState('');
  const [showSubjectBreakdown, setShowSubjectBreakdown] = useState(false);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const livenessAbortRef = useRef(false);

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const [statsRes, routineRes] = await Promise.all([
          api.get('/student/attendance-stats'),
          api.get('/student/routine')
        ]);
        setStats(statsRes.data);
        setRoutine(routineRes.data);
      } catch (error) {
        console.error("Error fetching student data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStudentData();
  }, []);

  const handleStartMarking = (rId) => {
    setSelectedRoutineId(rId);
    setIsMarking(true);
    verifyLocation();
  };

  const ALLOWED_LOCATIONS = [
    { name: "Techno India University", lat: 22.5758538, lng: 88.4271862 },
    { name: "Godrej Genesis Building", lat: 22.5737, lng: 88.4336 }
  ];
  const MAX_RADIUS_METERS = 500;

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const p1 = lat1 * Math.PI/180;
    const p2 = lat2 * Math.PI/180;
    const dp = (lat2-lat1) * Math.PI/180;
    const dl = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(dp/2) * Math.sin(dp/2) +
              Math.cos(p1) * Math.cos(p2) *
              Math.sin(dl/2) * Math.sin(dl/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const verifyLocation = () => {
    setGeoStatus('locating');
    if (!navigator.geolocation) {
      setGeoStatus('failed');
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        let minDistance = Infinity;
        let nearestLocation = null;
        
        for (const loc of ALLOWED_LOCATIONS) {
          const distance = calculateDistance(latitude, longitude, loc.lat, loc.lng);
          if (distance < minDistance) {
            minDistance = distance;
            nearestLocation = loc;
          }
        }
        
        if (minDistance <= MAX_RADIUS_METERS) {
          alert(`✅ You are inside permitted premises (${nearestLocation.name}).`);
          setVerifiedCoords({ lat: latitude, lng: longitude });
          setGeoStatus('success');
          startCamera();
        } else {
          alert(`❌ You are outside permitted premises! Distance to nearest: ${Math.round(minDistance)}m`);
          setGeoStatus('failed');
        }
      },
      (error) => {
        setGeoStatus('failed');
        alert('Failed to get location. Ensure you are within school premises.');
      }
    );
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        startLivenessCheck();
      }
    } catch (err) {
      alert("Camera access denied or unavailable.");
      setGeoStatus('failed');
    }
  };

  const startLivenessCheck = async () => {
    setLivenessStatus('loading_models');
    setLivenessPrompt('Loading face recognition & liveness models...');
    try {
      await loadFaceModels();
      setLivenessStatus('ready');
      setLivenessPrompt(
        ENABLE_LIVENESS
          ? 'Look directly at the camera, then click Start Liveness & Verify.'
          : 'Look directly at the camera, then click Capture & Verify.'
      );
    } catch (error) {
      console.error('Error loading models:', error);
      setLivenessStatus('failed');
      setLivenessPrompt('Failed to load biometric models.');
    }
  };

  const captureAndMatch = async () => {
    if (!videoRef.current) return;
    livenessAbortRef.current = false;
    setLivenessStatus('checking');

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const startedAt = Date.now();
    const TIMEOUT_MS = 30000;

    let stage = ENABLE_LIVENESS ? 'blink' : 'capture'; // 'blink' -> 'head_turn' -> 'capture'
    const earBaselineSamples = [];
    let baselineEar = 0;
    let sawBlinkDip = false;
    let sawHeadTurn = false;
    const descriptorSamples = [];

    setLivenessPrompt(
      ENABLE_LIVENESS
        ? 'Step 1/3: Keep your face centered and BLINK naturally'
        : 'Hold still — capturing frontal face...'
    );

    try {
      while (!livenessAbortRef.current) {
        if (Date.now() - startedAt > TIMEOUT_MS) {
          alert('Liveness check timed out. Please try again in good lighting.');
          setLivenessStatus('ready');
          setLivenessPrompt('Timed out. Click Start Liveness & Verify to retry.');
          return;
        }

        const res = await detectSingleQualifiedFace(videoRef.current);
        if (res.status === 'no_face') {
          setLivenessPrompt('No face detected — look directly at the camera');
          await sleep(140);
          continue;
        }
        if (res.status === 'multiple_faces') {
          setLivenessPrompt('Multiple faces detected — only one person allowed');
          await sleep(160);
          continue;
        }
        if (res.status === 'too_far') {
          setLivenessPrompt('Move closer to the camera');
          await sleep(140);
          continue;
        }
        if (res.status !== 'ok') {
          await sleep(120);
          continue;
        }

        const { landmarks, descriptor } = res.detection;
        const ear = computeEyeAspectRatio(landmarks);
        const yaw = computeYawRatio(landmarks);

        if (stage === 'blink') {
          if (earBaselineSamples.length < 4) {
            earBaselineSamples.push(ear);
            if (earBaselineSamples.length === 4) {
              baselineEar = earBaselineSamples.reduce((a, b) => a + b, 0) / 4;
            }
            setLivenessPrompt('Step 1/3: Calibrating eyes — keep looking straight...');
          } else {
            const blinkThreshold = Math.min(0.23, baselineEar * 0.80);
            const reopenThreshold = Math.max(0.24, baselineEar * 0.88);
            if (!sawBlinkDip && ear < blinkThreshold) {
              sawBlinkDip = true;
              setLivenessPrompt('Step 1/3: Blink detected — now open your eyes');
            } else if (sawBlinkDip && ear >= reopenThreshold) {
              stage = 'head_turn';
              setLivenessPrompt('Step 2/3: Turn your head slightly LEFT or RIGHT, then look back');
            } else if (!sawBlinkDip) {
              setLivenessPrompt('Step 1/3: Look at the camera and BLINK once naturally');
            }
          }
        } else if (stage === 'head_turn') {
          if (!sawHeadTurn && (yaw < 0.37 || yaw > 0.63)) {
            sawHeadTurn = true;
            setLivenessPrompt('Step 2/3: Head turn detected — now look straight ahead');
          } else if (sawHeadTurn && yaw >= 0.40 && yaw <= 0.60) {
            stage = 'capture';
            setLivenessPrompt('Step 3/3: Hold still — capturing frontal face...');
          }
        } else if (stage === 'capture') {
          if (yaw >= 0.40 && yaw <= 0.60) {
            descriptorSamples.push(descriptor);
            setLivenessPrompt(`Step 3/3: Capturing face (${descriptorSamples.length}/3)...`);
            if (descriptorSamples.length >= 3) {
              const averaged = averageDescriptors(descriptorSamples);
              setLivenessPrompt('Verifying against registered face...');
              try {
                await api.post('/student/verify-face', { faceDescriptor: averaged });
                setLiveDescriptor(averaged);
                setLivenessStatus('verified');
                setLivenessPrompt('Face match verified! Click Submit Attendance.');
              } catch (verifyErr) {
                setLiveDescriptor(null);
                setLivenessStatus('failed');
                setLivenessPrompt(
                  verifyErr.response?.data?.message ||
                    'Face match failed. Registered face does not match.'
                );
              }
              return;
            }
          } else {
            setLivenessPrompt('Step 3/3: Face the camera straight ahead...');
          }
        }

        await sleep(110);
      }
    } catch (error) {
      console.error('Error in liveness/face capture:', error);
      setLivenessStatus('failed');
      setLivenessPrompt('Liveness check failed. Please retry.');
    }
  };

  const submitAttendance = async () => {
    try {
      await api.post('/student/mark-attendance', {
        routineId: selectedRoutineId,
        location: verifiedCoords,
        faceDescriptor: liveDescriptor,
        livenessVerified: ENABLE_LIVENESS,
      });
      alert('Attendance Marked Successfully!');

      cancelMarking();

      const { data } = await api.get('/student/attendance-stats');
      setStats(data);
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to mark attendance';
      alert(msg);
      if (error.response?.status === 403) {
        setLiveDescriptor(null);
        setLivenessStatus('ready');
        setLivenessPrompt('Server verification failed. Click Start Liveness & Verify to retry.');
      }
    }
  };

  const cancelMarking = () => {
    livenessAbortRef.current = true;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setIsMarking(false);
    setGeoStatus('idle');
    setLivenessStatus('idle');
    setLivenessPrompt('');
    setVerifiedCoords(null);
    setLiveDescriptor(null);
  };

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 flex flex-col md:flex-row items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Overall Attendance</h2>
          <p className="text-gray-500 max-w-md">Maintain above 30% to avoid academic warnings.</p>
        </div>
        
        <button 
          onClick={() => setShowSubjectBreakdown(true)}
          className="mt-6 md:mt-0 relative w-32 h-32 flex items-center justify-center focus:outline-none hover:scale-105 transition-transform group cursor-pointer"
          title="Click to view distribution"
        >
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="64" cy="64" r="56" className="stroke-current text-gray-100 group-hover:text-blue-50 transition-colors" strokeWidth="12" fill="none" />
            <circle 
              cx="64" cy="64" r="56" 
              className={`stroke-current ${stats?.percentage < 30 ? 'text-red-500' : 'text-green-500'}`} 
              strokeWidth="12" fill="none" 
              strokeDasharray="351.8" 
              strokeDashoffset={351.8 - (351.8 * (stats?.percentage || 0)) / 100}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
             <span className="text-2xl font-bold text-gray-900">{stats?.percentage}%</span>
             <span className="text-[10px] text-gray-500 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">View Details</span>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center"><Calendar className="w-5 h-5 mr-2 text-blue-500"/> Today's Classes</h3>
          <div className="space-y-4">
            {routine.slice(0, 3).map((r, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 rounded-lg border border-gray-100 bg-gray-50">
                <div>
                  <h4 className="font-bold text-gray-900">{r.subject}</h4>
                  <p className="text-sm text-gray-500">{r.startTime} - {r.endTime}</p>
                </div>
                {!isMarking && (
                  <button 
                    onClick={() => handleStartMarking(r._id)}
                    className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                  >
                    <Play className="w-4 h-4 mr-2" /> Mark Present
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {isMarking && (
          <div className="bg-white rounded-xl shadow-xl border border-blue-200 p-6 relative overflow-hidden ring-4 ring-blue-50">
            <h3 className="font-bold text-xl mb-4 text-gray-900">Smart Attendance Verification</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {geoStatus === 'locating' && <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>}
                  {geoStatus === 'success' && <CheckCircle className="w-6 h-6 text-green-500" />}
                  {geoStatus === 'failed' && <XCircle className="w-6 h-6 text-red-500" />}
                  <span className={`font-medium ${geoStatus === 'success' ? 'text-green-700' : 'text-gray-700'}`}>
                    {geoStatus === 'locating' ? 'Verifying location within school premises...' : 
                     geoStatus === 'success' ? 'Location verified successfully.' : 'Location verification failed.'}
                  </span>
                </div>
                {/* DEV-ONLY bypass — remove before production deployment */}
                {geoStatus === 'failed' && (
                  <button
                    onClick={() => {
                      setVerifiedCoords({ lat: 22.5758538, lng: 88.4271862 }); // campus coords
                      setGeoStatus('success');
                      startCamera();
                    }}
                    className="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border border-yellow-300 px-3 py-1 rounded font-medium"
                  >
                    ⚠️ Dev Bypass
                  </button>
                )}
              </div>

              {geoStatus === 'success' && (
                <div className="mt-4 rounded-xl overflow-hidden bg-black aspect-video relative">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]"></video>
                  
                  {['loading_models', 'checking'].includes(livenessStatus) && (
                    <div className="absolute inset-x-0 bottom-0 bg-black/70 flex flex-col items-center justify-center text-white p-3 text-center backdrop-blur-sm">
                      <div className="flex items-center space-x-2">
                        <Camera className="w-5 h-5 animate-pulse text-blue-400" />
                        <p className="font-semibold text-sm">
                          {livenessPrompt || (livenessStatus === 'loading_models' ? 'Loading AI Models...' : 'Running Liveness Check...')}
                        </p>
                      </div>
                    </div>
                  )}

                  {livenessStatus === 'ready' && (
                    <div className="absolute bottom-3 inset-x-3 flex flex-col items-center space-y-2">
                      {livenessPrompt && (
                        <div className="bg-black/70 text-white text-xs px-3 py-1 rounded-full">
                          {livenessPrompt}
                        </div>
                      )}
                      <button
                        onClick={captureAndMatch}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-bold shadow-lg flex items-center shadow-blue-500/50"
                      >
                        <Camera className="w-5 h-5 mr-2" /> {ENABLE_LIVENESS ? 'Start Liveness & Verify' : 'Capture & Verify'}
                      </button>
                    </div>
                  )}

                  {livenessStatus === 'verified' && (
                    <div className="absolute inset-0 bg-green-500/20 border-4 border-green-500 flex items-center justify-center">
                      <div className="bg-white text-green-600 px-4 py-2 rounded-full font-bold shadow-lg flex items-center text-sm">
                        <CheckCircle className="w-5 h-5 mr-2" /> Face Match Verified
                      </div>
                    </div>
                  )}

                  {livenessStatus === 'failed' && (
                    <div className="absolute inset-0 bg-red-500/20 border-4 border-red-500 flex flex-col items-center justify-center space-y-3">
                      <div className="bg-white text-red-600 px-4 py-2 rounded-full font-bold shadow-lg flex items-center text-sm">
                        <XCircle className="w-5 h-5 mr-2" /> {livenessPrompt || 'Liveness Check Failed'}
                      </div>
                      <button
                        onClick={captureAndMatch}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-full text-xs font-semibold shadow"
                      >
                        Retry Liveness
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4 flex space-x-3">
                <button 
                  onClick={cancelMarking}
                  className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={submitAttendance}
                  disabled={livenessStatus !== 'verified'}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${
                    livenessStatus === 'verified' 
                      ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200' 
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Submit Attendance
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showSubjectBreakdown && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900">Attendance Distribution</h3>
              <button onClick={() => setShowSubjectBreakdown(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
            </div>
            <div className="p-6">
              <div className="h-64 flex items-end justify-around border-b border-gray-200 pb-2 space-x-4">
                {stats?.subjectBreakdown?.map((subject, idx) => {
                  const percent = Math.min((subject.attended / subject.total) * 100, 100);
                  return (
                    <div key={idx} className="flex flex-col items-center flex-1 group">
                      <div className="w-full flex justify-center mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <span className="text-xs font-bold bg-gray-800 text-white px-2 py-1 rounded">
                           {subject.attended}/{subject.total}
                         </span>
                      </div>
                      <div 
                        className={`w-full max-w-[60px] rounded-t-md transition-all duration-1000 ease-out cursor-pointer flex items-end justify-center pb-2 text-white font-bold text-xs ${percent < 50 ? 'bg-red-500 hover:bg-red-400' : percent < 75 ? 'bg-yellow-500 hover:bg-yellow-400' : 'bg-green-500 hover:bg-green-400'}`}
                        style={{ height: `${Math.max(percent, 10)}%` }}
                      >
                        {percent.toFixed(0)}%
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-around mt-3 text-xs text-gray-500 font-medium">
                {stats?.subjectBreakdown?.map((subject, idx) => (
                  <span key={idx} className="text-center flex-1 px-1">{subject.subject.split(' ').map(w => w[0]).join('')} ({subject.subject})</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
