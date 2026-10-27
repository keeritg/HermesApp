//
//  AudioRecorder.swift
//  HermesAI
//

import AVFoundation
import Foundation

/// Records one clip at a time to an .m4a file and reports a live input level for the UI.
@MainActor
final class AudioRecorder: ObservableObject {
    @Published private(set) var isRecording = false
    @Published private(set) var level: Float = 0
    @Published private(set) var elapsed: TimeInterval = 0

    private var recorder: AVAudioRecorder?
    private var timer: Timer?

    enum RecorderError: LocalizedError {
        case permissionDenied
        case couldNotStart

        var errorDescription: String? {
            switch self {
            case .permissionDenied:
                return "HermesAI needs microphone access to record. You can turn it on in Settings > Privacy & Security > Microphone."
            case .couldNotStart:
                return "Recording couldn't start. Please try again."
            }
        }
    }

    func start() async throws {
        guard await AVAudioApplication.requestRecordPermission() else {
            throw RecorderError.permissionDenied
        }

        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker])
        try session.setActive(true)

        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 44_100,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue,
        ]
        let recorder = try AVAudioRecorder(url: RecordingStore.newFileURL(), settings: settings)
        recorder.isMeteringEnabled = true
        guard recorder.record() else { throw RecorderError.couldNotStart }

        self.recorder = recorder
        isRecording = true
        elapsed = 0
        timer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { [weak self] _ in
            Task { @MainActor in self?.tick() }
        }
    }

    /// Stops recording and returns the file and its length.
    func stop() -> (url: URL, duration: TimeInterval)? {
        guard let recorder else { return nil }
        let duration = recorder.currentTime
        recorder.stop()
        reset()
        return (recorder.url, duration)
    }

    private func tick() {
        guard let recorder else { return }
        recorder.updateMeters()
        // averagePower is in dB (about -160 to 0). Map -50...0 dB to 0...1 for display.
        let db = recorder.averagePower(forChannel: 0)
        level = max(0, min(1, (db + 50) / 50))
        elapsed = recorder.currentTime
    }

    private func reset() {
        timer?.invalidate()
        timer = nil
        recorder = nil
        isRecording = false
        level = 0
    }
}
