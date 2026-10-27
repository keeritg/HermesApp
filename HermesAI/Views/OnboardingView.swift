//
//  OnboardingView.swift
//  HermesAI
//

import SwiftUI

/// First launch: explains what the app does (and doesn't) and asks for the cat's name.
struct OnboardingView: View {
    @AppStorage("catName") private var catName = ""
    @State private var name = ""
    @FocusState private var nameFocused: Bool

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Image(systemName: "pawprint.fill")
                    .font(.system(size: 56))
                    .foregroundStyle(.tint)
                    .padding(.top, 40)

                Text("Learn your cat's normal")
                    .font(.largeTitle.bold())

                VStack(alignment: .leading, spacing: 16) {
                    point("mic.fill", "Record your cat's sounds and note what was happening.")
                    point("calendar", "See when and how often they vocalize over time.")
                    point("chart.line.uptrend.xyaxis", "Notice changes worth keeping an eye on, and share the log with your vet.")
                }

                Text("HermesAI doesn't translate meows or diagnose anything. If you're worried about your cat, contact your vet.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)

                TextField("Your cat's name", text: $name)
                    .textFieldStyle(.roundedBorder)
                    .textInputAutocapitalization(.words)
                    .focused($nameFocused)
                    .submitLabel(.done)
                    .onSubmit(save)

                Button(action: save) {
                    Text("Get started")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            .padding(24)
        }
    }

    private func point(_ symbol: String, _ text: String) -> some View {
        Label {
            Text(text)
        } icon: {
            Image(systemName: symbol).foregroundStyle(.tint)
        }
    }

    private func save() {
        let trimmed = name.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        catName = trimmed
    }
}

#Preview {
    OnboardingView()
}
