namespace Auth_Services.Services
{
    public class TFA_Services
    {
        public static string Generate2FAToken(string username)
        {
            // Get current time as a string (Ticks are long numbers representing time)
            string timestamp = DateTime.UtcNow.Ticks.ToString();

            // Combine with a separator that won't appear in usernames
            string rawData = $"{username}|{timestamp}";

            // Encrypt the whole string
            return DEncript.EncryptString(rawData);
        }


        public static string Validate2FAToken(string token)
        {
            // Decrypt the token to get the original data
            string decryptedData = DEncript.DecryptString(token);
            // Split the data back into username and timestamp
            string[] parts = decryptedData.Split('|');
            if (parts.Length != 2)
            {
                throw new ArgumentException("Invalid token format");
            }
            string username = parts[0];
            string timestampStr = parts[1];
            // Parse the timestamp
            if (!long.TryParse(timestampStr, out long ticks))
            {
                throw new ArgumentException("Invalid timestamp in token");
            }
            DateTime tokenTime = new DateTime(ticks, DateTimeKind.Utc);
            TimeSpan timeElapsed = DateTime.UtcNow - tokenTime;
            // Check if the token is still valid (within 5 minutes)
            if (timeElapsed.TotalMinutes > 5)
            {
                throw new ArgumentException("Token has expired");
            }
            return username;
        }
    }
}
