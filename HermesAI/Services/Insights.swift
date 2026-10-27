//
//  Insights.swift
//  HermesAI
//

import Foundation

/// The parts of a recording the weekly comparison needs. Kept separate from SwiftData so it is easy to test.
struct SoundSample {
    let date: Date
    let pitchHz: Double?
}

struct PeriodStats: Equatable {
    let count: Int
    let nightCount: Int
    let medianPitch: Double?

    var nightShare: Double {
        count == 0 ? 0 : Double(nightCount) / Double(count)
    }
}

struct WeeklyComparison {
    let thisWeek: PeriodStats
    let lastWeek: PeriodStats
    let hasEnoughData: Bool
    /// Plain-language notes about changes worth watching. Empty when nothing changed much.
    let observations: [String]
}

/// Compares the last 7 days with the 7 days before.
///
/// The thresholds below are simple rules of thumb for "this looks different", not clinically
/// validated cut-offs. Counts only reflect what the owner chose to record.
enum Insights {
    static let minimumPerWeek = 5
    static let countChangeThreshold = 0.5
    static let nightShareChangeThreshold = 0.2
    static let pitchChangeThreshold = 0.15

    /// Night is 10pm to 6am, when vets most often hear about new yowling in older cats.
    static func isNight(_ date: Date, calendar: Calendar = .current) -> Bool {
        let hour = calendar.component(.hour, from: date)
        return hour >= 22 || hour < 6
    }

    static func stats(for samples: [SoundSample], calendar: Calendar = .current) -> PeriodStats {
        let pitches = samples.compactMap(\.pitchHz).sorted()
        return PeriodStats(
            count: samples.count,
            nightCount: samples.filter { isNight($0.date, calendar: calendar) }.count,
            medianPitch: pitches.isEmpty ? nil : pitches[pitches.count / 2]
        )
    }

    static func compare(_ samples: [SoundSample], now: Date = .now, calendar: Calendar = .current) -> WeeklyComparison {
        let weekAgo = now.addingTimeInterval(-7 * 24 * 3600)
        let twoWeeksAgo = now.addingTimeInterval(-14 * 24 * 3600)
        let thisWeek = stats(for: samples.filter { $0.date > weekAgo && $0.date <= now }, calendar: calendar)
        let lastWeek = stats(for: samples.filter { $0.date > twoWeeksAgo && $0.date <= weekAgo }, calendar: calendar)

        let enough = thisWeek.count >= minimumPerWeek && lastWeek.count >= minimumPerWeek
        guard enough else {
            return WeeklyComparison(thisWeek: thisWeek, lastWeek: lastWeek, hasEnoughData: false, observations: [])
        }

        var notes: [String] = []

        let countChange = Double(thisWeek.count - lastWeek.count) / Double(lastWeek.count)
        if abs(countChange) >= countChangeThreshold {
            let direction = countChange > 0 ? "up" : "down"
            notes.append("You logged \(thisWeek.count) sounds this week, \(direction) from \(lastWeek.count) last week.")
        }

        if abs(thisWeek.nightShare - lastWeek.nightShare) >= nightShareChangeThreshold {
            notes.append("\(percent(thisWeek.nightShare)) of this week's sounds were at night (10pm to 6am), compared with \(percent(lastWeek.nightShare)) last week.")
        }

        if let current = thisWeek.medianPitch, let before = lastWeek.medianPitch, before > 0,
           abs(current - before) / before >= pitchChangeThreshold {
            let direction = current > before ? "higher" : "lower"
            notes.append("Typical pitch was \(direction) this week: about \(Int(current.rounded())) Hz, compared with \(Int(before.rounded())) Hz.")
        }

        return WeeklyComparison(thisWeek: thisWeek, lastWeek: lastWeek, hasEnoughData: true, observations: notes)
    }

    static func percent(_ share: Double) -> String {
        "\(Int((share * 100).rounded()))%"
    }
}
