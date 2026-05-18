//
//  VocalizationType.swift
//  HermesAI
//
//  Created by Keerit Gill on 4/3/26.
//

import Foundation

enum VocalizationType: String, CaseIterable {
    case silent = "Silent"
    case purr = "Purr"
    case meow = "Meow"
    case hiss = "Hiss"
    case trill = "Trill"
    case chirp = "Chirp"
    case growl = "Growl"
    
    var description: String {
        return self.rawValue
    }
    
    var emoji: String {
        switch self {
        case .silent: return "🔇"
        case .purr: return "😻"
        case .meow: return "🐱"
        case .hiss: return "😾"
        case .trill: return "💫"
        case .chirp: return "🐦"
        case .growl: return "😼"
        }
    }
}
