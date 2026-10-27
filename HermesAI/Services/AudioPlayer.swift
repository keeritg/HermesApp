//
//  AudioPlayer.swift
//  HermesAI
//

import AVFoundation
import Foundation

/// Plays back one saved recording at a time.
@MainActor
final class AudioPlayer: NSObject, ObservableObject, AVAudioPlayerDelegate {
    @Published private(set) var playingID: UUID?

    private var player: AVAudioPlayer?

    func toggle(_ recording: Recording) {
        if playingID == recording.id {
            stop()
            return
        }
        stop()
        do {
            try AVAudioSession.sharedInstance().setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker])
            try AVAudioSession.sharedInstance().setActive(true)
            let player = try AVAudioPlayer(contentsOf: recording.fileURL)
            player.delegate = self
            player.play()
            self.player = player
            playingID = recording.id
        } catch {
            playingID = nil
        }
    }

    func stop() {
        player?.stop()
        player = nil
        playingID = nil
    }

    nonisolated func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        Task { @MainActor in self.stop() }
    }
}
