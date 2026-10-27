//
//  RecordingStore.swift
//  HermesAI
//

import Foundation

/// Where audio files live on the phone. Nothing is uploaded anywhere.
enum RecordingStore {
    static var directory: URL {
        let url = URL.documentsDirectory.appendingPathComponent("Recordings", isDirectory: true)
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }

    static func newFileURL() -> URL {
        directory.appendingPathComponent("\(UUID().uuidString).m4a")
    }

    static func deleteFile(named fileName: String) {
        try? FileManager.default.removeItem(at: directory.appendingPathComponent(fileName))
    }
}
