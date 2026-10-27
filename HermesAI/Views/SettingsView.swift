//
//  SettingsView.swift
//  HermesAI
//

import SwiftData
import SwiftUI

struct SettingsView: View {
    @AppStorage("catName") private var catName = ""
    @Query(sort: \Recording.createdAt) private var recordings: [Recording]
    @State private var exportURL: URL?
    @State private var exportError: String?

    private var version: String {
        let info = Bundle.main.infoDictionary
        let short = info?["CFBundleShortVersionString"] as? String ?? "?"
        let build = info?["CFBundleVersion"] as? String ?? "?"
        return "\(short) (\(build))"
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Your cat") {
                    TextField("Name", text: $catName)
                        .textInputAutocapitalization(.words)
                }

                Section {
                    if let exportURL {
                        ShareLink(item: exportURL) {
                            Label("Share sound log (CSV)", systemImage: "square.and.arrow.up")
                        }
                    } else {
                        Text("Record a sound to create a log you can share.")
                            .foregroundStyle(.secondary)
                    }
                } header: {
                    Text("Share with your vet")
                } footer: {
                    Text("A spreadsheet of every recording: date and time, what was happening, length and approximate pitch. Audio stays on your phone.")
                }

                Section("About HermesAI") {
                    Text("HermesAI helps you learn your cat's normal pattern of sounds and notice changes over time. It doesn't translate meows or diagnose anything, and it isn't a substitute for a vet.")
                    Text("Your recordings are stored only on this phone.")
                    LabeledContent("Version", value: version)
                }
            }
            .navigationTitle("Settings")
            .onAppear(perform: prepareExport)
            .onChange(of: recordings.count) { prepareExport() }
            .onChange(of: catName) { prepareExport() }
        }
    }

    private func prepareExport() {
        guard !recordings.isEmpty else {
            exportURL = nil
            return
        }
        exportURL = try? CSVExporter.writeFile(for: recordings, catName: catName)
    }
}

#Preview {
    SettingsView()
        .modelContainer(for: Recording.self, inMemory: true)
}
