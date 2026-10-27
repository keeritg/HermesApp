//
//  RecordView.swift
//  HermesAI
//

import SwiftData
import SwiftUI

/// A clip that has been recorded but not yet tagged and saved.
struct PendingClip: Identifiable {
    let id = UUID()
    let url: URL
    let duration: TimeInterval
    let createdAt: Date
    var pitchHz: Double?
}

struct RecordView: View {
    @AppStorage("catName") private var catName = ""
    @StateObject private var recorder = AudioRecorder()
    @State private var pending: PendingClip?
    @State private var errorMessage: String?

    /// Clips shorter than this are almost always accidental taps.
    private let minimumDuration: TimeInterval = 0.4

    var body: some View {
        NavigationStack {
            VStack(spacing: 32) {
                Spacer()

                Text(recorder.isRecording ? "Listening…" : "Tap when \(catName.isEmpty ? "your cat" : catName) makes a sound")
                    .font(.title3)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal)

                Button(action: toggle) {
                    ZStack {
                        Circle()
                            .fill(Color.accentColor.opacity(0.15))
                            .frame(width: 220, height: 220)
                            .scaleEffect(recorder.isRecording ? 1 + CGFloat(recorder.level) * 0.25 : 1)
                            .animation(.easeOut(duration: 0.1), value: recorder.level)
                        Circle()
                            .fill(recorder.isRecording ? Color.red : Color.accentColor)
                            .frame(width: 160, height: 160)
                        Image(systemName: recorder.isRecording ? "stop.fill" : "mic.fill")
                            .font(.system(size: 56, weight: .semibold))
                            .foregroundStyle(.white)
                    }
                }
                .buttonStyle(.plain)
                .accessibilityLabel(recorder.isRecording ? "Stop recording" : "Start recording")

                Text(recorder.isRecording ? Self.format(recorder.elapsed) : " ")
                    .font(.title2.monospacedDigit())

                Spacer()
            }
            .navigationTitle("Record")
            .sheet(item: $pending) { clip in
                TagSheet(clip: clip)
            }
            .alert("Couldn't record", isPresented: .constant(errorMessage != nil)) {
                Button("OK") { errorMessage = nil }
            } message: {
                Text(errorMessage ?? "")
            }
        }
    }

    private func toggle() {
        if recorder.isRecording {
            guard let result = recorder.stop() else { return }
            guard result.duration >= minimumDuration else {
                try? FileManager.default.removeItem(at: result.url)
                return
            }
            let createdAt = Date.now.addingTimeInterval(-result.duration)
            Task {
                let pitch = await Task.detached(priority: .userInitiated) {
                    PitchAnalyzer.dominantPitch(of: result.url)
                }.value
                pending = PendingClip(url: result.url, duration: result.duration, createdAt: createdAt, pitchHz: pitch)
            }
        } else {
            Task {
                do {
                    try await recorder.start()
                } catch {
                    errorMessage = error.localizedDescription
                }
            }
        }
    }

    static func format(_ seconds: TimeInterval) -> String {
        String(format: "%d:%04.1f", Int(seconds) / 60, seconds.truncatingRemainder(dividingBy: 60))
    }
}

/// Asks the owner what was happening, then saves the clip.
struct TagSheet: View {
    let clip: PendingClip

    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @State private var selected: ContextTag?
    @State private var note = ""
    @State private var saved = false

    private let columns = [GridItem(.flexible()), GridItem(.flexible())]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text("What was happening?")
                        .font(.title2.bold())

                    LazyVGrid(columns: columns, spacing: 12) {
                        ForEach(ContextTag.allCases) { tag in
                            Button {
                                selected = tag
                            } label: {
                                Label(tag.label, systemImage: tag.symbol)
                                    .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 8)
                                    .background(
                                        RoundedRectangle(cornerRadius: 12)
                                            .fill(selected == tag ? Color.accentColor.opacity(0.2) : Color(.secondarySystemBackground))
                                    )
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(selected == tag ? Color.accentColor : .clear, lineWidth: 2)
                                    )
                            }
                            .buttonStyle(.plain)
                        }
                    }

                    TextField("Note (optional)", text: $note, axis: .vertical)
                        .lineLimit(2...4)
                        .textFieldStyle(.roundedBorder)

                    Text("\(String(format: "%.1f", clip.duration)) seconds\(clip.pitchHz.map { " · about \(Int($0.rounded())) Hz" } ?? "")")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                .padding()
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Discard", role: .destructive) { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save", action: save)
                        .disabled(selected == nil)
                }
            }
        }
        .presentationDetents([.large])
        .interactiveDismissDisabled()
        .onDisappear {
            // Anything not saved (Discard) is deleted so stray audio doesn't pile up on the phone.
            if !saved { try? FileManager.default.removeItem(at: clip.url) }
        }
    }

    private func save() {
        guard let selected else { return }
        let recording = Recording(
            createdAt: clip.createdAt,
            duration: clip.duration,
            fileName: clip.url.lastPathComponent,
            tag: selected,
            note: note.trimmingCharacters(in: .whitespacesAndNewlines),
            pitchHz: clip.pitchHz
        )
        context.insert(recording)
        try? context.save()
        saved = true
        dismiss()
    }
}

#Preview {
    RecordView()
        .modelContainer(for: Recording.self, inMemory: true)
}
