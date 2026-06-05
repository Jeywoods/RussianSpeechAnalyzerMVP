// src/api/speechApi.ts
import axios from "axios";
import { SERVER_URL, REQUEST_TIMEOUT_MS } from "../config";
import { AnalysisResult } from "../types/analysis";

export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await axios.get(`${SERVER_URL}/health`, { timeout: 5000 });
    return res.data?.status === "ok";
  } catch {
    return false;
  }
}

export async function analyzeAudio(audioUri: string): Promise<AnalysisResult> {
  const formData = new FormData();

  // React Native FormData принимает объект с uri/type/name
  formData.append("file", {
    uri: audioUri,
    type: "audio/wav",
    name: "recording.wav",
  } as any);

  const response = await axios.post<AnalysisResult>(
    `${SERVER_URL}/analyze`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
        Accept: "application/json",
      },
      timeout: REQUEST_TIMEOUT_MS,
    }
  );

  return response.data;
}
