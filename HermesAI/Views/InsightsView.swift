//
//  InsightsView.swift
//  HermesAI
//

import Charts
import SwiftData
import SwiftUI

struct InsightsView: View {
    @AppStorage("catName") private var catName = ""
    @Query(sort: \Recording.createdAt) private var recordings: [Recording]

    private var comparison: WeeklyComparison {
        Insights.compare(recordings.map { SoundSample(date: $0.createdAt, pitchHz: $0.pitchHz) })
    }

    /// Recordings per day for the last 14 days, including days with none.
    private var dailyCounts: [(day: Date, count: Int)] {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: .now)
        let counts = Dictionary(grouping: recordings) { calendar.startOfDay(for: $0.createdAt) }.mapValues(\.count)
        return (0..<14).reversed().compactMap { offset in
            calendar.date(byAdding: .day, value: -offset, to: today).map { ($0, counts[$0] ?? 0) }
        }
    }

    var body: some View {
        NavigationStack {
            List {
                Section("Last 14 days") {
                    Chart(dailyCounts, id: \.day) { item in
                        BarMark(
                            x: .value("Day", item.day, unit: .day),
                            y: .value("Sounds", item.count)
                        )
                        .foregroundStyle(Color.accentColor)
                    }
                    .chartXAxis {
                        AxisMarks(values: .stride(by: .day, count: 3)) { _ in
                            AxisValueLabel(format: .dateTime.month(.abbreviated).day())
                        }
                    }
                    .frame(height: 180)
                    .padding(.vertical, 8)
                }

                Section("This week vs. last week") {
                    statRow("Sounds logged", comparison.thisWeek.count.formatted(), comparison.lastWeek.count.formatted())
                    statRow("At night (10pm–6am)", Insights.percent(comparison.thisWeek.nightShare), Insights.percent(comparison.lastWeek.nightShare))
                    statRow("Typical pitch", pitch(comparison.thisWeek.medianPitch), pitch(comparison.lastWeek.medianPitch))
                }

                Section("Worth watching") {
                    if !comparison.hasEnoughData {
                        Text("Log at least \(Insights.minimumPerWeek) sounds in each of the last two weeks to see changes in \(catName.isEmpty ? "your cat" : catName)'s pattern.")
                            .foregroundStyle(.secondary)
                    } else if comparison.observations.isEmpty {
                        Label("No big changes from last week.", systemImage: "checkmark.circle")
                    } else {
                        ForEach(comparison.observations, id: \.self) { note in
                            Label(note, systemImage: "eye")
                        }
                    }
                }

                Section {
                    Text("These are simple comparisons of the sounds you chose to record, not a diagnosis. If a change continues, or you're worried about your cat, talk to your vet. You can share your log from Settings.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Insights")
        }
    }

    private func statRow(_ title: String, _ thisWeek: String, _ lastWeek: String) -> some View {
        HStack {
            Text(title)
            Spacer()
            VStack(alignment: .trailing) {
                Text(thisWeek).font(.body.weight(.semibold))
                Text("last week \(lastWeek)").font(.caption).foregroundStyle(.secondary)
            }
        }
    }

    private func pitch(_ hz: Double?) -> String {
        hz.map { "~\(Int($0.rounded())) Hz" } ?? "–"
    }
}

#Preview {
    InsightsView()
        .modelContainer(for: Recording.self, inMemory: true)
}
