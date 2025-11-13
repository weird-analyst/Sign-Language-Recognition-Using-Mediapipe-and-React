import React, { useState, useRef, useEffect, useCallback } from "react";
import "./Detect.css";
import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";
import {
  drawConnectors,
  drawLandmarks,
} from "@mediapipe/drawing_utils";

import { HAND_CONNECTIONS } from "@mediapipe/hands";

import Webcam from "react-webcam";
import { SignImageData } from "../../data/SignImageData";
import ProgressBar from "./ProgressBar/ProgressBar";

const Detect = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [webcamRunning, setWebcamRunning] = useState(false);
  const [gestureOutput, setGestureOutput] = useState("");
  const [gestureRecognizer, setGestureRecognizer] = useState(null);
  const [runningMode, setRunningMode] = useState("IMAGE");
  const [progress, setProgress] = useState(0);
  
  // Simple recording - just a string that updates
  const [recordedText, setRecordedText] = useState("");
  
  // Simple tracking with refs
  const lastAddedSignRef = useRef("");
  const [currentFrames, setCurrentFrames] = useState(0); // Changed to state for debugging

  const requestRef = useRef();
  const [currentImage, setCurrentImage] = useState(null);

  // Rotate images every 5 seconds when webcam is running
  useEffect(() => {
    let intervalId;
    if (webcamRunning) {
      intervalId = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * SignImageData.length);
        const randomImage = SignImageData[randomIndex];
        setCurrentImage(randomImage);
      }, 5000);
    }
    return () => clearInterval(intervalId);
  }, [webcamRunning]);

  // Temporarily enable console for debugging
  // if (
  //   process.env.NODE_ENV === "development" ||
  //   process.env.NODE_ENV === "production"
  // ) {
  //   console.log = function () {};
  // }

  const predictWebcam = useCallback(() => {
    // Safety check: ensure webcam is ready
    if (!webcamRef.current || !webcamRef.current.video || 
        webcamRef.current.video.readyState < 2) {
      if (webcamRunning === true) {
        requestRef.current = requestAnimationFrame(predictWebcam);
      }
      return;
    }

    if (runningMode === "IMAGE") {
      setRunningMode("VIDEO");
      gestureRecognizer.setOptions({ runningMode: "VIDEO" });
    }

    let nowInMs = Date.now();
    const results = gestureRecognizer.recognizeForVideo(
      webcamRef.current.video,
      nowInMs
    );

    const canvasCtx = canvasRef.current.getContext("2d");
    canvasCtx.save();
    canvasCtx.clearRect(
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );

    const videoWidth = webcamRef.current.video.videoWidth;
    const videoHeight = webcamRef.current.video.videoHeight;

    // Set video width
    webcamRef.current.video.width = videoWidth;
    webcamRef.current.video.height = videoHeight;

    // Set canvas height and width
    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;

    // Draw the results on the canvas, if any.
    if (results.landmarks) {
      for (const landmarks of results.landmarks) {
        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
          color: "#00FF00",
          lineWidth: 5,
        });

        drawLandmarks(canvasCtx, landmarks, { color: "#FF0000", lineWidth: 2 });
      }
    }
    if (results.gestures.length > 0) {
      const detectedSign = results.gestures[0][0].categoryName;
      const confidence = Math.round(parseFloat(results.gestures[0][0].score) * 100);
      
      setGestureOutput(detectedSign);
      setProgress(confidence);
      
      // SUPER SIMPLE: Count frames (10 frames ~= 1 second at 10fps)
      if (detectedSign === lastAddedSignRef.current) {
        // Same sign as last added, skip
        setCurrentFrames(0);
      } else {
        setCurrentFrames(prev => {
          const newCount = prev + 1;
          
          // After 10 frames (~1 second), add to text
          if (newCount >= 10) {
            console.log(`✅ Adding sign: ${detectedSign} (after ${newCount} frames)`);
            setRecordedText(prevText => {
              const newText = prevText ? `${prevText} ${detectedSign}` : detectedSign;
              console.log(`📝 New recorded text: "${newText}"`);
              return newText;
            });
            lastAddedSignRef.current = detectedSign;
            return 0; // Reset counter
          }
          
          return newCount;
        });
      }
    } else {
      // No gesture detected - reset so same sign can be added again after a break
      setGestureOutput("");
      setProgress("");
      setCurrentFrames(0);
      lastAddedSignRef.current = ""; // KEY CHANGE: Reset so you can add same sign again
    }

    if (webcamRunning === true) {
      requestRef.current = requestAnimationFrame(predictWebcam);
    }
  }, [webcamRunning, runningMode, gestureRecognizer]);

  const animate = useCallback(() => {
    requestRef.current = requestAnimationFrame(animate);
    predictWebcam();
  }, [predictWebcam]);

  // Push detected text to backend API
  const pushDetectedText = useCallback(async (detectedText) => {
    const url = process.env.REACT_APP_PUSH_API_URL;
    const apiKey = process.env.REACT_APP_PUSH_API_KEY;
    
    if (!url || !apiKey) {
      console.warn("Push API URL or API Key not configured in .env.local");
      return;
    }
    
    if (!detectedText || detectedText.trim() === "") {
      console.log("No text to push (empty)");
      return;
    }
    
    const body = { text: detectedText };
    const headers = { 
      "Content-Type": "application/json", 
      "x-api-key": apiKey 
    };
    
    try {
      console.log(`Pushing text to API: "${detectedText}"`);
      const r = await fetch(url, { 
        method: "POST", 
        headers, 
        body: JSON.stringify(body) 
      });
      const j = await r.json();
      console.log("Push result:", j);
    } catch (e) {
      console.error("Push failed:", e);
    }
  }, []);

  const enableCam = useCallback(() => {
    if (!gestureRecognizer) {
      alert("Please wait for gestureRecognizer to load");
      return;
    }

    if (webcamRunning === true) {    
      // Push the recorded text to the API
      if (recordedText && recordedText.trim() !== "") {
        pushDetectedText(recordedText);
      }
      
      setWebcamRunning(false);
      cancelAnimationFrame(requestRef.current);
      setCurrentImage(null);
      setGestureOutput("");
      setProgress("");
      lastAddedSignRef.current = "";
      setCurrentFrames(0);
    } else {
      // Start detection
      setWebcamRunning(true);
      setRecordedText(""); // Clear text
      lastAddedSignRef.current = "";
      setCurrentFrames(0);
      console.log("🎬 === STARTING DETECTION ===");
      // Give webcam a moment to initialize
      setTimeout(() => {
        requestRef.current = requestAnimationFrame(animate);
      }, 100);
    }
  }, [webcamRunning, gestureRecognizer, animate, recordedText, pushDetectedText]);

  useEffect(() => {
    async function loadGestureRecognizer() {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      const recognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            process.env.REACT_APP_FIREBASE_STORAGE_TRAINED_MODEL_25_04_2023,
        },
        numHands: 2,
        runningMode: runningMode,
      });
      setGestureRecognizer(recognizer);
    }
    loadGestureRecognizer();
  }, [runningMode]);

  return (
    <div className="signlang_detection-container">
      {/* Left Side - Webcam and Controls */}
      <div className="signlang_left-section">
        {/* Webcam */}
        <div className="signlang_webcam-wrapper">
          <Webcam
            audio={false}
            ref={webcamRef}
            className="signlang_webcam"
          />
          <canvas ref={canvasRef} className="signlang_canvas" />
        </div>

        {/* Controls - Below Webcam */}
        <div className="signlang_controls">
          <button className="signlang_control-btn" onClick={enableCam}>
            {webcamRunning ? "⏹ Stop" : "▶ Start"}
          </button>
        </div>
      </div>

      {/* Right Side - Detection Info and Text */}
      <div className="signlang_right-section">
        {/* Detection Status */}
        <div className="signlang_detection-status">
          <h3 className="signlang_section-title">Current Sign</h3>
          <p className="gesture_output">
            {gestureOutput || "No sign detected"}
          </p>
          {progress ? <ProgressBar progress={progress} /> : null}
          
          {/* Visual progress for frame counting */}
          {gestureOutput && currentFrames > 0 && (
            <div style={{marginTop: '10px'}}>
              <p style={{color: '#00d4ff', fontSize: '14px', margin: '5px 0'}}>
                Holding: {currentFrames}/10 frames
              </p>
              <div style={{
                width: '100%',
                height: '4px',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${(currentFrames / 10) * 100}%`,
                  height: '100%',
                  background: currentFrames >= 10 
                    ? '#00ff00' 
                    : 'linear-gradient(90deg, #00d4ff, #0099ff)',
                  transition: 'width 0.1s ease-out'
                }}/>
              </div>
            </div>
          )}
        </div>

        {/* Recorded Text Box */}
        <div className="signlang_recorded-text-container">
          <div className="signlang_title-row">
            <h3 className="signlang_section-title">Recorded Signs</h3>
            {recordedText && (
              <button 
                className="signlang_clear-btn-small" 
                onClick={() => {
                  setRecordedText("");
                  lastAddedSignRef.current = "";
                  console.log("🗑️ Cleared recorded text");
                }}
              >
                Clear
              </button>
            )}
          </div>
          <div className="signlang_text-box">
            {recordedText || "Hold a sign for 1 second to record it..."}
          </div>
        </div>

        {/* Practice Images - At Bottom */}
        <div className="signlang_practice-section">
          <h3 className="signlang_section-title">Practice Sign</h3>
          <div className="signlang_practice-image">
            {currentImage ? (
              <img src={currentImage.url} alt={`Sign ${currentImage.id}`} />
            ) : (
              <p className="signlang_placeholder">
                Click Start to see practice signs
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Detect;
