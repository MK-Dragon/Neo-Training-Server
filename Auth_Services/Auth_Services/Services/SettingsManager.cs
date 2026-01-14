using Auth_Services.Models;
using System.IO;
using System.Text.Json;

public sealed class SettingsManager
{
    private const string FilePath = "MySettings.json";

    // --- 1. The Singleton Instance and Lazy Initialization ---

    // Static private field to hold the single instance of the class.
    private static readonly Lazy<Task<ConnectionSettings>> _lazySettings = new(LoadSettingsInternalAsync);

    // Public static property to access the settings.
    // The value factory (LoadSettingsInternalAsync) runs ONLY on the first call to .Value.
    public static Task<ConnectionSettings> CurrentSettings => _lazySettings.Value;

    // --- 2. The Private Constructor ---

    // Prevent direct instantiation (enforce the Singleton pattern)
    private SettingsManager() { }

    // --- 3. The Private Loading Logic ---

    // This method contains the actual file reading logic.
    // It is only called once by the Lazy<T> object.
    private static async Task<ConnectionSettings> LoadSettingsInternalAsync()
    {
        Console.WriteLine($"--- Loading settings from file ({FilePath}) for the first time... ---");

        if (!File.Exists(FilePath))
        {
            Console.WriteLine("Settings file not found. Returning default settings.");
            // If file doesn't exist, return a new instance with all defaults.
            SaveSettingsAsync(new ConnectionSettings()).Wait();
            return new ConnectionSettings();
        }

        try
        {
            string jsonString = await File.ReadAllTextAsync(FilePath);
            ConnectionSettings settings = JsonSerializer.Deserialize<ConnectionSettings>(jsonString);

            Console.WriteLine("Settings loaded successfully.");
            return settings;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error loading settings: {ex.Message}. Returning default settings.");
            // Handle parsing errors gracefully
            return new ConnectionSettings();
        }
    }

    // Saving can still be done from this static manager if needed.
    public static async Task SaveSettingsAsync(ConnectionSettings settings)
    {
        var options = new JsonSerializerOptions { WriteIndented = true };
        string jsonString = JsonSerializer.Serialize(settings, options);
        await File.WriteAllTextAsync(FilePath, jsonString);
        Console.WriteLine($"Settings saved successfully to {FilePath}");
    }
}