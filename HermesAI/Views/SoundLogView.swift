//
//  SoundLogView.swift
//  HermesAI
//

import SwiftData
import SwiftUI

struct SoundLogView: View {
    @Query(sort: \Recording.createdAt, order: .reverse) private var recordings: [Recording]
    @Environment(\.modelContext) private var context
    @EnvironmentObject private var player: AudioPlayer

    private var days: [(day: Date, items: [Recording])] {
        let grouped = Dictionary(grouping: recordings) { Calendar.current.startOfDay(for: $0.createdAt) }
        return grouped.keys.sorted(by: >).map { ($0, grouped[$0] ?? []) }
    }

    var body: some View {
        NavigationStack {
            Group {
                if recordings.isEmpty {
                    ContentUnavailableView(
                        "No recordings yet",
                        systemImage: "waveform",
                        description: Text("Sounds you record and tag will show up here.")
                    )
                } else {
                    List {
                        ForEach(days, id: \.day) { day in
                            Section(day.day.formatted(.dateTime.weekday(.wide).month().day())) {
                                ForEach(day.items) { recording in
                                    RecordingRow(recording: recording, isPlaying: player.playingID == recording.id) {
                                        player.toggle(recording)
                                    }
                                }
                                .onDelete { offsets in
                                    delete(offsets.map { day.items[$0] })
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Timeline")
        }
    }

    private func delete(_ items: [Recording]) {
        for recording in items {
            if player.playingID == recording.id { player.stop() }
            RecordingStore.deleteFile(named: recording.fileName)
            context.delete(recording)
        }
        try? context.save()
    }
}

struct RecordingRow: View {
    let recording: Recording
    let isPlaying: Bool
    let onPlay: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: recording.tag.symbol)
                .foregroundStyle(.tint)
                .frame(width: 28)

            VStack(alignment: .leading, spacing: 2) {
                Text(recording.tag.label)
                    .font(.body.weight(.medium))
                Text(details)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                if !recording.note.isEmpty {
                    Text(recording.note)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
            }

            Spacer()

            Button(action: onPlay) {
                Image(systemName: isPlaying ? "stop.circle.fill" : "play.circle.fill")
                    .font(.title)
            }
            .buttonStyle(.plain)
            .foregroundStyle(.tint)
            .accessibilityLabel(isPlaying ? "Stop playback" : "Play recording")
        }
        .padding(.vertical, 4)
    }

    private var details: String {
        var parts = [recording.createdAt.formatted(date: .omitted, time: .shortened)]
        parts.append(String(format: "%.1fs", recording.duration))
        if let pitch = recording.pitchHz { parts.append("~\(Int(pitch.rounded())) Hz") }
        if Insights.isNight(recording.createdAt) { parts.append("night") }
        return parts.joined(separator: " · ")
    }
}

#Preview {
    SoundLogView()
        .modelContainer(for: Recording.self, inMemory: true)
        .environmentObject(AudioPlayer())
}
