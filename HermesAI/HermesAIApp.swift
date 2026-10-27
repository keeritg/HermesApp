//
//  HermesAIApp.swift
//  HermesAI
//
//  Created by Keerit Gill on 2/13/26.
//

import SwiftData
import SwiftUI

@main
struct HermesAIApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(for: Recording.self)
    }
}
