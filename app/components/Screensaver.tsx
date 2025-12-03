"use client";

import { useState, useEffect, useRef } from "react";

interface ScreensaverProps {
  onDismiss: () => void;
}

const SCREENSAVER_IMAGES = [
  "/images/ads/ad1.jpg",
  "/images/ads/ad2.jpg", 
  "/images/ads/ad3.jpg",
];

const IMAGE_ROTATION_INTERVAL = 5000; // 5 seconds

export default function Screensaver({ onDismiss }: ScreensaverProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const imageTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Rotate images
  useEffect(() => {
    imageTimerRef.current = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % SCREENSAVER_IMAGES.length);
    }, IMAGE_ROTATION_INTERVAL);

    return () => {
      if (imageTimerRef.current) {
        clearInterval(imageTimerRef.current);
      }
    };
  }, []);

  // Dismiss on any key press or mouse movement
  useEffect(() => {
    const handleActivity = () => {
      onDismiss();
    };

    window.addEventListener('keydown', handleActivity);
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    return () => {
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [onDismiss]);

  return (
    <div className="screen-wrapper">
      <div className="screen-content screensaver">
        <div className="screensaver-image-container">
          <img
            src={SCREENSAVER_IMAGES[currentImageIndex]}
            alt={`Advertisement ${currentImageIndex + 1}`}
            className="screensaver-image"
          />
        </div>

        {/* Indicator dots */}
        <div className="screensaver-indicator">
          <div className="screensaver-dots">
            {SCREENSAVER_IMAGES.map((_, index) => (
              <div
                key={index}
                className={`screensaver-dot ${currentImageIndex === index ? 'active' : ''}`}
              />
            ))}
          </div>
          <p className="screensaver-text">Press any key to continue</p>
        </div>
      </div>
    </div>
  );
}