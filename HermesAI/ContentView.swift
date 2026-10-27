//
//  ContentView.swift
//  HermesAI
//
//  Created by Keerit Gill on 2/13/26.
//

import SwiftData
import SwiftUI

struct ContentView: View {
    @AppStorage("catName") private var catName = ""
    @StateObject private var player = AudioPlayer()

    var body: some View {
        TabView {
            RecordView()
                .tabItem { Label("Record", systemImage: "mic.fill") }
            SoundLogView()
                .tabItem { Label("Timeline", systemImage: "list.bullet") }
            InsightsView()
                .tabItem { Label("Insights", systemImage: "chart.bar.fill") }
            SettingsView()
                .tabItem { Label("Settings", systemImage: "gearshape.fill") }
        }
        .environmentObject(player)
        .fullScreenCover(isPresented: .constant(catName.isEmpty)) {
            OnboardingView()
        }
    }
}

#Preview {
    ContentView()
        .modelContainer(for: Recording.self, inMemory: true)
}
