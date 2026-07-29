"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useMicrophoneLevel() {
  const [level, setLevel] = useState(0);
  const [permission, setPermission] = useState<"idle" | "requesting" | "granted" | "denied">("idle");
  const contextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const noiseFloorRef = useRef(0.015);
  const smoothedRef = useRef(0);
  const calibrationEndsAtRef = useRef(0);

  const resetCalibration = useCallback(() => {
    noiseFloorRef.current = 0.015;
    smoothedRef.current = 0;
    calibrationEndsAtRef.current = performance.now() + 1000;
    setLevel(0);
  }, []);

  const stop = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    void contextRef.current?.close();
    frameRef.current = null;
    streamRef.current = null;
    contextRef.current = null;
    setLevel(0);
  }, []);

  const start = useCallback(async () => {
    setPermission("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          autoGainControl: false,
          echoCancellation: false,
          noiseSuppression: false,
        },
      });
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.15;
      source.connect(analyser);
      const timeData = new Float32Array(analyser.fftSize);
      const frequencyData = new Uint8Array(analyser.frequencyBinCount);
      resetCalibration();
      streamRef.current = stream;
      contextRef.current = context;
      setPermission("granted");

      const read = () => {
        analyser.getFloatTimeDomainData(timeData);
        let sum = 0;
        for (const sample of timeData) {
          sum += sample * sample;
        }
        const volume = Math.sqrt(sum / timeData.length);

        analyser.getByteFrequencyData(frequencyData);
        const nyquist = context.sampleRate / 2;
        let lowMid = 0;
        let high = 0;
        let lowMidCount = 0;
        let highCount = 0;

        for (let index = 0; index < frequencyData.length; index += 1) {
          const hz = (index / frequencyData.length) * nyquist;
          const value = frequencyData[index] / 255;
          if (hz >= 120 && hz < 2800) {
            lowMid += value;
            lowMidCount += 1;
          }
          if (hz >= 2800 && hz < 10000) {
            high += value;
            highCount += 1;
          }
        }

        lowMid = lowMidCount ? lowMid / lowMidCount : 0;
        high = highCount ? high / highCount : 0;

        if (performance.now() < calibrationEndsAtRef.current) {
          noiseFloorRef.current += (volume * 1.8 - noiseFloorRef.current) * 0.08;
        }

        const clamp = (value: number) => Math.max(0, Math.min(1, value));
        const total = lowMid + high + 0.0001;
        const noiseRatio = high / total;
        const voiceRatio = lowMid / total;
        const looksLikeBlow = noiseRatio > 0.42;
        const looksLikeVoice = voiceRatio > 0.62;
        let strength = clamp((volume - noiseFloorRef.current) / 0.22);

        if (looksLikeVoice && !looksLikeBlow) strength *= 0.15;
        if (looksLikeBlow) strength *= 1.15;
        strength = clamp(strength);

        const smoothingSpeed = strength > smoothedRef.current ? 0.35 : 0.14;
        smoothedRef.current += (strength - smoothedRef.current) * smoothingSpeed;
        setLevel(smoothedRef.current);
        frameRef.current = requestAnimationFrame(read);
      };
      read();
      return true;
    } catch {
      setPermission("denied");
      return false;
    }
  }, [resetCalibration]);

  useEffect(() => stop, [stop]);

  return { level, permission, start, stop, resetCalibration };
}
