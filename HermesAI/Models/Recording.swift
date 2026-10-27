//
//  Recording.swift
//  HermesAI
//

import Foundation
import SwiftData

/// One sound the owner recorded, plus what they said was happening at the time.
@Model
final class Recording {
    var id: UUID
    var createdAt: Date
    var duration: Double
    var fileName: String
    var tagRaw: String
    var note: String
    /// Approximate dominant pitch in Hz, measured from the audio. Nil if the clip was too quiet to measure.
    var pitchHz: Double?

    init(id: UUID = UUID(), createdAt: Date, duration: Double, fileName: String, tag: ContextTag, note: String = "", pitchHz: Double?) {
        self.id = id
        self.createdAt = createdAt
        self.duration = duration
        self.fileName = fileName
        self.tagRaw = tag.rawValue
        self.note = note
        self.pitchHz = pitchHz
    }

    var tag: ContextTag {
        get { ContextTag(rawValue: tagRaw) ?? .unsure }
        set { tagRaw = newValue.rawValue }
    }

    var fileURL: URL {
        RecordingStore.directory.appendingPathComponent(fileName)
    }
}

/// What the owner says was going on when the cat made the sound.
/// These are the owner's labels, not something the app infers.
enum ContextTag: String, CaseIterable, Identifiable {
    case food
    case door
    case attention
    case greeting
    case play
    case litterBox
    case stressed
    case other
    case unsure

    var id: String { rawValue }

    var label: String {
        switch self {
        case .food: return "Waiting for food"
        case .door: return "At a door"
        case .attention: return "Wants attention"
        case .greeting: return "Greeting"
        case .play: return "Playing"
        case .litterBox: return "Litter box"
        case .stressed: return "Stressed or upset"
        case .other: return "Something else"
        case .unsure: return "Not sure"
        }
    }

    var symbol: String {
        switch self {
        case .food: return "fork.knife"
        case .door: return "door.left.hand.open"
        case .attention: return "hand.raised.fill"
        case .greeting: return "hand.wave.fill"
        case .play: return "figure.play"
        case .litterBox: return "tray.fill"
        case .stressed: return "exclamationmark.triangle.fill"
        case .other: return "ellipsis.circle.fill"
        case .unsure: return "questionmark.circle.fill"
        }
    }
}
