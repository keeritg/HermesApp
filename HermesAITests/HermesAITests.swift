//
//  HermesAITests.swift
//  HermesAITests
//
//  Created by Keerit Gill on 2/13/26.
//

import Foundation
import Testing
@testable import HermesAI

struct PitchAnalyzerTests {
    private func sine(_ frequency: Double, seconds: Double = 0.5, sampleRate: Double = 44_100, amplitude: Float = 0.5) -> [Float] {
        (0..<Int(seconds * sampleRate)).map { amplitude * Float(sin(2 * .pi * frequency * Double($0) / sampleRate)) }
    }

    @Test func findsPitchOfAPureTone() throws {
        let pitch = try #require(PitchAnalyzer.dominantPitch(samples: sine(600), sampleRate: 44_100))
        // One FFT bin at 2048 samples / 44.1 kHz is about 21.5 Hz.
        #expect(abs(pitch - 600) < 22)
    }

    @Test func ignoresSilence() {
        let silence = [Float](repeating: 0, count: 44_100)
        #expect(PitchAnalyzer.dominantPitch(samples: silence, sampleRate: 44_100) == nil)
    }

    @Test func tooShortClipHasNoPitch() {
        #expect(PitchAnalyzer.dominantPitch(samples: sine(600, seconds: 0.01), sampleRate: 44_100) == nil)
    }
}

struct InsightsTests {
    private var calendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "America/Los_Angeles")!
        return calendar
    }

    /// Noon on 2026-10-27, Los Angeles time.
    private var now: Date {
        calendar.date(from: DateComponents(year: 2026, month: 10, day: 27, hour: 12))!
    }

    private func sample(daysAgo: Double, hour: Int, pitch: Double? = 600) -> SoundSample {
        let day = calendar.date(byAdding: .day, value: -Int(daysAgo), to: calendar.startOfDay(for: now))!
        return SoundSample(date: calendar.date(bySettingHour: hour, minute: 0, second: 0, of: day)!, pitchHz: pitch)
    }

    @Test func nightIsTenPMToSixAM() {
        #expect(Insights.isNight(sample(daysAgo: 1, hour: 23).date, calendar: calendar))
        #expect(Insights.isNight(sample(daysAgo: 1, hour: 3).date, calendar: calendar))
        #expect(!Insights.isNight(sample(daysAgo: 1, hour: 6).date, calendar: calendar))
        #expect(!Insights.isNight(sample(daysAgo: 1, hour: 21).date, calendar: calendar))
    }

    @Test func needsEnoughDataInBothWeeks() {
        let samples = (0..<10).map { _ in sample(daysAgo: 1, hour: 12) }
        let result = Insights.compare(samples, now: now, calendar: calendar)
        #expect(!result.hasEnoughData)
        #expect(result.observations.isEmpty)
        #expect(result.thisWeek.count == 10)
    }

    @Test func steadyPatternHasNoObservations() {
        let samples = (0..<5).map { _ in sample(daysAgo: 2, hour: 12) } + (0..<5).map { _ in sample(daysAgo: 9, hour: 12) }
        let result = Insights.compare(samples, now: now, calendar: calendar)
        #expect(result.hasEnoughData)
        #expect(result.observations.isEmpty)
    }

    @Test func flagsMoreNightSoundsAndLowerPitch() {
        let lastWeek = (0..<6).map { _ in sample(daysAgo: 9, hour: 12, pitch: 700) }
        let thisWeek = (0..<6).map { _ in sample(daysAgo: 2, hour: 23, pitch: 500) }
        let result = Insights.compare(lastWeek + thisWeek, now: now, calendar: calendar)
        #expect(result.thisWeek.nightShare == 1)
        #expect(result.lastWeek.nightShare == 0)
        #expect(result.observations.contains { $0.contains("at night") })
        #expect(result.observations.contains { $0.contains("lower") })
        #expect(!result.observations.contains { $0.contains("logged") })
    }

    @Test func flagsLargeChangeInCount() {
        let samples = (0..<5).map { _ in sample(daysAgo: 9, hour: 12) } + (0..<10).map { _ in sample(daysAgo: 2, hour: 12) }
        let result = Insights.compare(samples, now: now, calendar: calendar)
        #expect(result.observations.contains("You logged 10 sounds this week, up from 5 last week."))
    }
}
