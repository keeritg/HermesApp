//
//  CSVExporter.swift
//  HermesAI
//

import Foundation

/// Builds a spreadsheet-friendly log an owner can share with their vet.
enum CSVExporter {
    static func csv(for recordings: [Recording]) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withFullDate, .withTime, .withColonSeparatorInTime]
        formatter.timeZone = .current

        var rows = ["date_time,context,night,duration_seconds,approx_pitch_hz,note"]
        for r in recordings.sorted(by: { $0.createdAt < $1.createdAt }) {
            let pitch = r.pitchHz.map { String(Int($0.rounded())) } ?? ""
            rows.append([
                formatter.string(from: r.createdAt),
                escape(r.tag.label),
                Insights.isNight(r.createdAt) ? "yes" : "no",
                String(format: "%.1f", r.duration),
                pitch,
                escape(r.note),
            ].joined(separator: ","))
        }
        return rows.joined(separator: "\n") + "\n"
    }

    static func writeFile(for recordings: [Recording], catName: String) throws -> URL {
        let safeName = catName.isEmpty ? "cat" : catName.replacingOccurrences(of: "/", with: "-")
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("\(safeName)-sound-log.csv")
        try csv(for: recordings).write(to: url, atomically: true, encoding: .utf8)
        return url
    }

    private static func escape(_ field: String) -> String {
        guard field.contains(where: { $0 == "," || $0 == "\"" || $0 == "\n" }) else { return field }
        return "\"" + field.replacingOccurrences(of: "\"", with: "\"\"") + "\""
    }
}
