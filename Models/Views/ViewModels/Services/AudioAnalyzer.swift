//
//  AudioAnalyzer.swift
//  HermesAI
//
//  Created by Keerit Gill on 2/13/26.
//
import Foundation
import AVFoundation
import Accelerate

/// Analyzes audio in real-time to detect cat vocalizations
class AudioAnalyzer: NSObject, ObservableObject {
    // Published properties that SwiftUI can observe
    @Published var isRecording = false
    @Published var currentFrequency: Double = 0
    @Published var currentIntensity: Double = 0
    @Published var detectedVocalization: VocalizationType = .silent
    
    // Audio engine components
    private var audioEngine: AVAudioEngine?
    private var inputNode: AVAudioInputNode?
    
    // Audio processing settings
    private let sampleRate: Double = 44100.0  // CD quality
    
    // MARK: - Permission Handling
    
    /// Request microphone permission from the user
    func requestMicrophonePermission() async -> Bool {
        return await AVAudioApplication.requestRecordPermission()
    }
    
    // MARK: - Recording Control
    
    /// Start recording and analyzing audio
    func startRecording() throws {
        // Configure audio session for recording
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.record, mode: .measurement)
        try audioSession.setActive(true)
        
        // Create audio engine
        audioEngine = AVAudioEngine()
        inputNode = audioEngine?.inputNode
        
        guard let inputNode = inputNode else {
            throw AudioError.noInputAvailable
        }
        
        // Get the recording format
        let recordingFormat = inputNode.outputFormat(forBus: 0)
        
        // Install tap to process audio buffers
        inputNode.installTap(
            onBus: 0,
            bufferSize: 4096,  // Process 4096 samples at a time
            format: recordingFormat
        ) { [weak self] buffer, time in
            self?.processAudioBuffer(buffer)
        }
        
        // Start the engine
        try audioEngine?.start()
        
        DispatchQueue.main.async {
            self.isRecording = true
        }
    }
    
    /// Stop recording
    func stopRecording() {
        audioEngine?.stop()
        inputNode?.removeTap(onBus: 0)
        
        DispatchQueue.main.async {
            self.isRecording = false
            self.currentIntensity = 0
            self.detectedVocalization = .silent
        }
    }
    
    // MARK: - Audio Processing
    
    /// Process each audio buffer as it comes in
    private func processAudioBuffer(_ buffer: AVAudioPCMBuffer) {
        guard let channelData = buffer.floatChannelData?[0] else { return }
        let frames = buffer.frameLength
        
        // Calculate volume (RMS = Root Mean Square)
        var rms: Float = 0
        vDSP_rmsqv(channelData, 1, &rms, vDSP_Length(frames))
        
        // Update intensity on main thread
        DispatchQueue.main.async {
            self.currentIntensity = Double(rms)
        }
        
        // Analyze frequency
        analyzeFrequency(channelData: channelData, frameCount: Int(frames))
        
        // Classify what type of cat sound this is
        classifyVocalization()
    }
    
    /// Analyze the frequency of the audio using FFT (Fast Fourier Transform)
    private func analyzeFrequency(channelData: UnsafeMutablePointer<Float>, frameCount: Int) {
        // Calculate FFT size (must be power of 2)
        let log2n = vDSP_Length(ceil(log2(Float(frameCount))))
        let fftLength = Int(1 << log2n)
        
        // Create FFT setup
        guard let fftSetup = vDSP_create_fftsetup(log2n, Int32(kFFTRadix2)) else {
            return
        }
        defer { vDSP_destroy_fftsetup(fftSetup) }
        
        // Prepare buffers for FFT
        var realp = [Float](repeating: 0, count: fftLength / 2)
        var imagp = [Float](repeating: 0, count: fftLength / 2)
        
        realp.withUnsafeMutableBufferPointer { realBuffer in
            imagp.withUnsafeMutableBufferPointer { imagBuffer in
                var output = DSPSplitComplex(realp: realBuffer.baseAddress!, imagp: imagBuffer.baseAddress!)
                
                // Convert input to split complex format
                channelData.withMemoryRebound(to: DSPComplex.self, capacity: fftLength / 2) { complexData in
                    vDSP_ctoz(complexData, 2, &output, 1, vDSP_Length(fftLength / 2))
                }
                
                // Perform FFT
                vDSP_fft_zrip(fftSetup, &output, 1, log2n, FFTDirection(FFT_FORWARD))
                
                // Calculate magnitudes
                var magnitudes = [Float](repeating: 0, count: fftLength / 2)
                vDSP_zvmags(&output, 1, &magnitudes, 1, vDSP_Length(fftLength / 2))
                
                if let maxMagnitude = magnitudes.max(),
                   let maxIndex = magnitudes.firstIndex(of: maxMagnitude) {
                    let frequency = Double(maxIndex) * sampleRate / Double(fftLength)
                    DispatchQueue.main.async {
                        self.currentFrequency = frequency
                    }
                } // closes imagBuffer closure
            } // closes realBuffer closure
        } // closes analyzeFrequency function
    }
                /// Classify the vocalization based on frequency and intensity
                private func classifyVocalization() {
                    let freq = currentFrequency
                    let intensity = currentIntensity
                    
                    var detected: VocalizationType = .silent
                    
                    // Cat vocalization frequency ranges (approximate)
                    // Source: Scientific studies on cat communication
                    
                    if intensity < 0.01 {
                        // Too quiet to detect anything
                        detected = .silent
                    } else if freq >= 25 && freq <= 150 {
                        // Low rumbling = purr
                        detected = .purr
                    } else if freq >= 200 && freq <= 600 && intensity > 0.1 {
                        // Mid-range with volume = meow
                        detected = .meow
                    } else if freq >= 2000 && intensity > 0.15 {
                        // High frequency with volume = hiss
                        detected = .hiss
                    } else if freq >= 400 && freq <= 1200 {
                        // Mid-high range = chirp or trill
                        detected = intensity > 0.2 ? .trill : .chirp
                    } else if freq < 200 && intensity > 0.2 {
                        // Low and loud = growl
                        detected = .growl
                    }
                    
                    // Update on main thread
                    DispatchQueue.main.async {
                        if self.detectedVocalization != detected {
                            self.detectedVocalization = detected
                        }
                    }
                }
                
                // MARK: - Error Types
                
                enum AudioError: Error {
                    case noInputAvailable
                    case permissionDenied
                }
            }
