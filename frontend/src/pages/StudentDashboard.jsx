import React, { useState, useEffect, useRef, useContext } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { MapPin, Camera, CheckCircle, XCircle, Calendar, Play } from 'lucide-react';
import * as faceapi from 'face-api.js/dist/face-api.js';

const StudentDashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [routine, setRoutine] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Smart Marker State
  const [isMarking, setIsMarking] = useState(false);
  const [geoStatus, setGeoStatus] = useState('idle'); // idle, locating, success, failed
  const [cameraActive, setCameraActive] = useState(false);
  const [livenessStatus, setLivenessStatus] = useState('idle'); // idle, loading_models, ready, checking, verified, failed
  const [selectedRoutineId, setSelectedRoutineId] = useState('');
  const [showSubjectBreakdown, setShowSubjectBreakdown] = useState(false);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);

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
    try {
      const MODEL_URL = 'https://cdn.jsdelivr.net/gh/cgarciagl/face-api.js@0.22.2/weights';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
      setLivenessStatus('ready');
    } catch (error) {
      console.error("Error loading models:", error);
      setLivenessStatus('failed');
    }
  };

  const captureAndMatch = async () => {
    if (!videoRef.current) return;
    setLivenessStatus('checking');
    try {
      const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
                                     .withFaceLandmarks()
                                     .withFaceDescriptor();
      
      if (detection && user?.faceDescriptor) {
        const storedDescriptor = new Float32Array(user.faceDescriptor);
        const distance = faceapi.euclideanDistance(detection.descriptor, storedDescriptor);
        
        if (distance < 0.5) {
          setLivenessStatus('verified');
        } else {
          alert('Face match failed (Distance: ' + distance.toFixed(2) + '). Please try again.');
          setLivenessStatus('ready');
        }
      } else {
        alert('No face detected. Please ensure good lighting and look directly at the camera.');
        setLivenessStatus('ready');
      }
    } catch (error) {
      console.error("Error in face matching:", error);
      setLivenessStatus('failed');
    }
  };

  const submitAttendance = async () => {
    try {
      await api.post('/student/mark-attendance', {
        routineId: selectedRoutineId,
        location: { lat: 0, lng: 0 }, // Mock
        livenessVerified: true
      });
      alert('Attendance Marked Successfully!');
      
      cancelMarking();
      
      const { data } = await api.get('/student/attendance-stats');
      setStats(data);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to mark attendance');
    }
  };

  const cancelMarking = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setIsMarking(false);
    setGeoStatus('idle');
    setLivenessStatus('idle');
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
                {geoStatus === 'failed' && (
                  <button 
                    onClick={() => { setGeoStatus('success'); startCamera(); }}
                    className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded"
                  >
                    Bypass (Demo)
                  </button>
                )}
              </div>

              {geoStatus === 'success' && (
                <div className="mt-4 rounded-xl overflow-hidden bg-black aspect-video relative">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]"></video>
                  
                  {['loading_models', 'checking'].includes(livenessStatus) && (
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white p-4 text-center backdrop-blur-sm">
                      <Camera className="w-8 h-8 mb-2 animate-pulse" />
                      <p className="font-semibold text-lg">
                        {livenessStatus === 'loading_models' ? 'Downloading AI Engine...' : 'Matching Face Data...'}
                      </p>
                      {livenessStatus === 'checking' && (
                        <div className="w-full max-w-xs bg-white/20 h-2 rounded-full mt-4 overflow-hidden">
                          <div className="h-full bg-blue-500 animate-[progress_2s_ease-in-out_infinite]"></div>
                        </div>
                      )}
                    </div>
                  )}

                  {livenessStatus === 'ready' && (
                    <div className="absolute bottom-4 inset-x-0 flex justify-center">
                       <button 
                         onClick={captureAndMatch}
                         className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-bold shadow-lg flex items-center shadow-blue-500/50"
                       >
                          <Camera className="w-5 h-5 mr-2" /> Capture & Verify
                       </button>
                    </div>
                  )}

                  {livenessStatus === 'verified' && (
                    <div className="absolute inset-0 bg-green-500/20 border-4 border-green-500 flex items-center justify-center">
                      <div className="bg-white text-green-600 px-4 py-2 rounded-full font-bold shadow-lg flex items-center">
                         <CheckCircle className="w-5 h-5 mr-2" /> Face Match Verified
                      </div>
                    </div>
                  )}

                  {livenessStatus === 'failed' && (
                    <div className="absolute inset-0 bg-red-500/20 border-4 border-red-500 flex items-center justify-center">
                      <div className="bg-white text-red-600 px-4 py-2 rounded-full font-bold shadow-lg flex items-center">
                         <XCircle className="w-5 h-5 mr-2" /> Face Match Failed
                      </div>
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
