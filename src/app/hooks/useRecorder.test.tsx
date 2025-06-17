import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest"; 
import useAudioRecorder from "./useRecorder";

const mockMediaRecorderStart = vi.fn();

const mockGetUserMedia = vi.fn();
if (!(global as any).navigator) {
  (global as any).navigator = {};
}
if (!(global as any).navigator.mediaDevices) {
  (global as any).navigator.mediaDevices = {};
}
(global as any).navigator.mediaDevices.getUserMedia = mockGetUserMedia;

describe("Audio Recorder Test", () => {
  it("attempts to record", async () => {
    mockGetUserMedia.mockReset();
    mockMediaRecorderStart.mockReset();

    const { result } = renderHook(() => useAudioRecorder());

    expect(result.current.isRecording).toBe(false);
    await act(async () => {
      await result.current.startRecording();
    });
    expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(mockMediaRecorderStart).toHaveBeenCalled();
    expect(result.current.isRecording).toBe(true);
  });
});
