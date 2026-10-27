//
//  PitchAnalyzer.swift
//  HermesAI
//

import Accelerate
import AVFoundation
import Foundation

/// Measures an approximate dominant pitch for a clip.
///
/// This is the strongest frequency between 150 and 3,000 Hz in the loudest parts of the clip,
/// taken as a median across short frames. It is a rough measurement for spotting change in one
/// cat over time. It is not a true fundamental frequency (a strong harmonic can win), and it does
/// not say what a sound means.
enum PitchAnalyzer {
    static let minFrequency = 150.0
    static let maxFrequency = 3_000.0

    static func dominantPitch(of url: URL) -> Double? {
        guard let file = try? AVAudioFile(forReading: url),
              file.length > 0,
              let buffer = AVAudioPCMBuffer(pcmFormat: file.processingFormat, frameCapacity: AVAudioFrameCount(file.length)),
              (try? file.read(into: buffer)) != nil,
              let channel = buffer.floatChannelData?[0]
        else { return nil }

        let samples = Array(UnsafeBufferPointer(start: channel, count: Int(buffer.frameLength)))
        return dominantPitch(samples: samples, sampleRate: file.processingFormat.sampleRate)
    }

    static func dominantPitch(samples: [Float], sampleRate: Double, frameSize: Int = 2048) -> Double? {
        guard samples.count >= frameSize else { return nil }
        let half = frameSize / 2
        let log2n = vDSP_Length(log2(Double(frameSize)))
        guard let setup = vDSP_create_fftsetup(log2n, FFTRadix(kFFTRadix2)) else { return nil }
        defer { vDSP_destroy_fftsetup(setup) }

        // Loudness of each half-overlapping frame, so we only measure the parts where the cat is vocalizing.
        var starts: [Int] = []
        var levels: [Float] = []
        samples.withUnsafeBufferPointer { ptr in
            var start = 0
            while start + frameSize <= samples.count {
                var rms: Float = 0
                vDSP_rmsqv(ptr.baseAddress! + start, 1, &rms, vDSP_Length(frameSize))
                starts.append(start)
                levels.append(rms)
                start += half
            }
        }
        guard let loudest = levels.max(), loudest > 0.001 else { return nil }

        var window = [Float](repeating: 0, count: frameSize)
        vDSP_hann_window(&window, vDSP_Length(frameSize), Int32(vDSP_HANN_NORM))

        let minBin = Int((minFrequency * Double(frameSize) / sampleRate).rounded(.up))
        let maxBin = min(half - 1, Int(maxFrequency * Double(frameSize) / sampleRate))
        guard minBin < maxBin else { return nil }

        var windowed = [Float](repeating: 0, count: frameSize)
        var real = [Float](repeating: 0, count: half)
        var imag = [Float](repeating: 0, count: half)
        var magnitudes = [Float](repeating: 0, count: half)
        var peaks: [Double] = []

        for (start, rms) in zip(starts, levels) where rms >= loudest * 0.3 {
            samples.withUnsafeBufferPointer { ptr in
                vDSP_vmul(ptr.baseAddress! + start, 1, window, 1, &windowed, 1, vDSP_Length(frameSize))
            }
            real.withUnsafeMutableBufferPointer { realPtr in
                imag.withUnsafeMutableBufferPointer { imagPtr in
                    var split = DSPSplitComplex(realp: realPtr.baseAddress!, imagp: imagPtr.baseAddress!)
                    windowed.withUnsafeBufferPointer { input in
                        input.baseAddress!.withMemoryRebound(to: DSPComplex.self, capacity: half) {
                            vDSP_ctoz($0, 2, &split, 1, vDSP_Length(half))
                        }
                    }
                    vDSP_fft_zrip(setup, &split, 1, log2n, FFTDirection(FFT_FORWARD))
                    vDSP_zvmags(&split, 1, &magnitudes, 1, vDSP_Length(half))
                }
            }
            var best = minBin
            for bin in minBin...maxBin where magnitudes[bin] > magnitudes[best] {
                best = bin
            }
            peaks.append(Double(best) * sampleRate / Double(frameSize))
        }

        guard !peaks.isEmpty else { return nil }
        peaks.sort()
        return peaks[peaks.count / 2]
    }
}
